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
import {
  extractPublicOfferItems,
  sanitizePublicCustomerNote,
} from "@/lib/public-offer-presentation";

const PUBLIC_OFFER_VIEW_RATE_LIMIT = 30;
const PUBLIC_OFFER_VIEW_RATE_WINDOW_MS = 60 * 1000;

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

function decimalToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "0.00";
  }

  if (typeof value === "object" && "toString" in value) {
    return String(value.toString());
  }

  return String(value);
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

function serializeJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(serializeJsonValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        serializeJsonValue(entryValue),
      ]),
    );
  }

  return value;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const rawToken = normalizePublicOfferToken(token);

  const rateLimit = checkPublicRateLimit(request, {
    scope: "public_offer_view",
    limit: PUBLIC_OFFER_VIEW_RATE_LIMIT,
    windowMs: PUBLIC_OFFER_VIEW_RATE_WINDOW_MS,
    token: rawToken ?? token,
  });

  if (!rateLimit.allowed) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_view",
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
      scope: "public_offer_view",
      reason: "invalid_token_format",
      severity: "warning",
      token,
    });

    return createSafePublicNotFoundResponse();
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
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      lastViewedAt: true,
      viewCount: true,
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          subtotal: true,
          taxRate: true,
          taxAmount: true,
          total: true,
          currency: true,
          items: true,
          notes: true,
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
      scope: "public_offer_view",
      reason: "token_not_found",
      severity: "warning",
      token: rawToken,
    });

    return createSafePublicNotFoundResponse();
  }

  if (link.revokedAt) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_view",
      reason: "revoked_link_opened",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return createSafePublicGoneResponse("Offer link is no longer active.");
  }

  if (isPublicOfferLinkExpired(link.expiresAt, now)) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_view",
      reason: "expired_link_opened",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
      },
    });

    return createSafePublicGoneResponse("Offer link has expired.");
  }

  if (link.quote.status === QuoteStatus.REJECTED || link.quote.status === QuoteStatus.EXPIRED) {
    return createSafePublicGoneResponse("Offer is no longer available.");
  }

  if (link.quote.status !== QuoteStatus.SENT && link.quote.status !== QuoteStatus.ACCEPTED) {
    logPublicSecurityEvent(request, {
      scope: "public_offer_view",
      reason: "quote_not_publicly_viewable",
      severity: "info",
      token: rawToken,
      extra: {
        linkId: link.id,
        quoteStatus: link.quote.status,
      },
    });

    return createSafePublicNotFoundResponse();
  }

  const updatedLink = await prisma.publicOfferLink.update({
    where: {
      id: link.id,
    },
    data: {
      lastViewedAt: now,
      viewCount: {
        increment: 1,
      },
    },
    select: {
      lastViewedAt: true,
      viewCount: true,
    },
  });

  const customerName = serializeCustomerName(link.quote.customer);
  const quoteAcceptedAt = link.quote.acceptedAt ?? link.acceptedAt;

  return NextResponse.json(
    {
      ok: true,
      offer: {
        quoteId: link.quote.id,
        quoteNumber: link.quote.quoteNumber,
        status: link.quote.status,
        customerName,
        subtotal: decimalToString(link.quote.subtotal),
        taxRate: decimalToString(link.quote.taxRate),
        taxAmount: decimalToString(link.quote.taxAmount),
        total: decimalToString(link.quote.total),
        currency: link.quote.currency,
        items: serializeJsonValue(extractPublicOfferItems(link.quote.items)),
        notes: sanitizePublicCustomerNote(link.quote.notes),
        validUntil: link.quote.validUntil?.toISOString() ?? null,
        sentAt: link.quote.sentAt?.toISOString() ?? null,
        acceptedAt: quoteAcceptedAt?.toISOString() ?? null,
        canAccept: link.quote.status === QuoteStatus.SENT && !quoteAcceptedAt,
      },
      link: {
        expiresAt: link.expiresAt.toISOString(),
        acceptedAt: link.acceptedAt?.toISOString() ?? null,
        lastViewedAt: updatedLink.lastViewedAt?.toISOString() ?? null,
        viewCount: updatedLink.viewCount,
      },
    },
    {
      headers: rateLimit.headers,
    },
  );
}