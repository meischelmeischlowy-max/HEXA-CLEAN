import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPublicOfferTokenHash,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";
import {
  checkPublicRateLimit,
  createPublicRateLimitResponse,
  createSafePublicGoneResponse,
  createSafePublicNotFoundResponse,
  logPublicSecurityEvent,
} from "@/lib/public-security";

const PUBLIC_OFFER_ACCEPT_RATE_LIMIT = 8;
const PUBLIC_OFFER_ACCEPT_RATE_WINDOW_MS = 5 * 60 * 1000;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function jsonError(message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      message,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

async function readJsonObject(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {};
    }

    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeAcceptanceValue(value: unknown): boolean {
  return value === true || value === "true" || value === "yes" || value === "accepted";
}

function serializeCustomerName(customer: {
  type: "PRIVATE" | "COMPANY";
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}) {
  if (customer.type === "COMPANY") {
    return customer.companyName || "Kunde";
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();

  return fullName || "Kunde";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const rawToken = normalizePublicOfferToken(token);

  const rateLimit = checkPublicRateLimit(request, {
    scope: "public_offer_accept",
    limit: PUBLIC_OFFER_ACCEPT_RATE_LIMIT,
    windowMs: PUBLIC_OFFER_ACCEPT_RATE_WINDOW_MS,
    token: rawToken ?? token,
  });

  if (!rateLimit.allowed) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "rate_limit_exceeded",
      severity: "warning",
      token: rawToken ?? token,
      extra: {
        limit: rateLimit.limit,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });

    return createPublicRateLimitResponse(rateLimit);
  }

  if (!rawToken) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "invalid_token_format",
      severity: "warning",
      token,
    });

    return createSafePublicNotFoundResponse();
  }

  const body = await readJsonObject(request);
  const confirmAcceptance = normalizeAcceptanceValue(body.confirmAcceptance);

  if (!confirmAcceptance) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "missing_acceptance_confirmation",
      severity: "info",
      token: rawToken,
    });

    return jsonError("Acceptance confirmation is required.", 400, {
      requiredField: "confirmAcceptance",
    });
  }

  const prisma = getPrisma();
  const tokenHash = createPublicOfferTokenHash(rawToken);
  const now = new Date();

  const link = await prisma.publicOfferLink.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      quoteId: true,
      customerId: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          customerId: true,
          orderId: true,
          sessionId: true,
          validUntil: true,
          sentAt: true,
          acceptedAt: true,
          customer: {
            select: {
              type: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  if (!link) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "token_not_found",
      severity: "warning",
      token: rawToken,
    });

    return createSafePublicNotFoundResponse();
  }

  if (link.revokedAt) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "revoked_link_accept_attempt",
      severity: "warning",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return createSafePublicGoneResponse("Offer link is no longer active.");
  }

  if (isPublicOfferLinkExpired(link.expiresAt, now)) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "expired_link_accept_attempt",
      severity: "warning",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return createSafePublicGoneResponse("Offer link has expired.");
  }

  if (link.quote.validUntil && link.quote.validUntil.getTime() <= now.getTime()) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "expired_quote_accept_attempt",
      severity: "warning",
      token: rawToken,
      extra: {
        linkId: link.id,
        quoteId: link.quote.id,
      },
    });

    return createSafePublicGoneResponse("Offer validity date has already expired.");
  }

  if (link.quote.status === QuoteStatus.REJECTED || link.quote.status === QuoteStatus.EXPIRED) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "inactive_quote_accept_attempt",
      severity: "warning",
      token: rawToken,
      extra: {
        linkId: link.id,
        quoteStatus: link.quote.status,
      },
    });

    return createSafePublicGoneResponse("Offer is no longer available.");
  }

  if (link.quote.status === QuoteStatus.ACCEPTED && link.quote.acceptedAt) {
    return NextResponse.json(
      {
        ok: true,
        message: "Offer was already accepted.",
        offer: {
          quoteId: link.quote.id,
          quoteNumber: link.quote.quoteNumber,
          status: link.quote.status,
          acceptedAt: link.quote.acceptedAt.toISOString(),
          customerName: serializeCustomerName(link.quote.customer),
        },
      },
      {
        headers: rateLimit.headers,
      },
    );
  }

  if (link.quote.status !== QuoteStatus.SENT) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_accept",
      reason: "quote_not_acceptable",
      severity: "warning",
      token: rawToken,
      extra: {
        linkId: link.id,
        quoteStatus: link.quote.status,
      },
    });

    return jsonError("Offer cannot be accepted in the current status.", 409, {
      quoteStatus: link.quote.status,
      requiredStatus: QuoteStatus.SENT,
    });
  }

  const acceptedQuote = await prisma.$transaction(async (tx) => {
    const updatedQuote = await tx.quote.update({
      where: {
        id: link.quote.id,
      },
      data: {
        status: QuoteStatus.ACCEPTED,
        acceptedAt: link.quote.acceptedAt ?? now,
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        acceptedAt: true,
        customerId: true,
        orderId: true,
        sessionId: true,
        customer: {
          select: {
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    await tx.publicOfferLink.update({
      where: {
        id: link.id,
      },
      data: {
        acceptedAt: now,
        lastViewedAt: now,
        viewCount: {
          increment: 1,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        customerId: updatedQuote.customerId,
        orderId: updatedQuote.orderId,
        sessionId: updatedQuote.sessionId,
        action: "STATUS_CHANGE",
        entityType: "Quote",
        entityId: updatedQuote.id,
        actorType: "customer_public_link",
        before: {
          status: link.quote.status,
          acceptedAt: link.quote.acceptedAt?.toISOString() ?? null,
        },
        after: {
          status: updatedQuote.status,
          acceptedAt: updatedQuote.acceptedAt?.toISOString() ?? null,
          publicOfferLinkId: link.id,
        },
        message: `Quote ${updatedQuote.quoteNumber} accepted by customer through public offer link.`,
        metadata: {
          rawTokenStored: false,
          tokenHashStoredOnly: true,
          source: "public_offer_link",
          securityHardened: true,
        },
      },
    });

    return updatedQuote;
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Offer accepted successfully.",
      offer: {
        quoteId: acceptedQuote.id,
        quoteNumber: acceptedQuote.quoteNumber,
        status: acceptedQuote.status,
        acceptedAt: acceptedQuote.acceptedAt?.toISOString() ?? null,
        customerName: serializeCustomerName(acceptedQuote.customer),
      },
    },
    {
      headers: rateLimit.headers,
    },
  );
}