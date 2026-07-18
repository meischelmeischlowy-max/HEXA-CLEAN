import { NextRequest, NextResponse } from "next/server";
import { AuditAction, PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPublicOfferTokenHash,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";
import {
  canRejectPublicOffer,
  isPublicOfferAlreadyRejected,
  isPublicOfferExpiredStatus,
  isPublicOfferRejectionLocked,
  normalizePublicOfferDecisionConfirmation,
} from "@/lib/public-offer-workflow";
import {
  checkPublicRateLimit,
  createPublicRateLimitResponse,
  createSafePublicGoneResponse,
  createSafePublicNotFoundResponse,
  logPublicSecurityEvent,
} from "@/lib/public-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_OFFER_REJECT_RATE_LIMIT = 8;
const PUBLIC_OFFER_REJECT_RATE_WINDOW_MS = 5 * 60 * 1000;

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

function responseHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);

  headers.set("Cache-Control", "no-store");

  return headers;
}

function jsonError(
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: false,
      message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: responseHeaders(extraHeaders),
    },
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  return NextResponse.json(data, {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

async function readJsonObject(
  request: NextRequest,
): Promise<Record<string, unknown>> {
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

function serializeCustomerName(customer: {
  type: "PRIVATE" | "COMPANY";
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}) {
  if (customer.type === "COMPANY") {
    return customer.companyName || "Kunde";
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Kunde";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const rawToken = normalizePublicOfferToken(token);

    const rateLimit = checkPublicRateLimit(request, {
      scope: "public_offer_reject",
      limit: PUBLIC_OFFER_REJECT_RATE_LIMIT,
      windowMs: PUBLIC_OFFER_REJECT_RATE_WINDOW_MS,
      token: rawToken ?? token,
    });

    if (!rateLimit.allowed) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
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
        scope: "public_offer_reject",
        reason: "invalid_token_format",
        severity: "warning",
        token,
      });

      return createSafePublicNotFoundResponse();
    }

    const body = await readJsonObject(request);
    const confirmRejection = normalizePublicOfferDecisionConfirmation(body.confirmRejection, "reject");

    if (!confirmRejection) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "missing_rejection_confirmation",
        severity: "info",
        token: rawToken,
      });

      return jsonError(
        "Die verbindliche Ablehnung der Offerte ist erforderlich.",
        400,
        {
          requiredField: "confirmRejection",
        },
        rateLimit.headers,
      );
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
        scope: "public_offer_reject",
        reason: "token_not_found",
        severity: "warning",
        token: rawToken,
      });

      return createSafePublicNotFoundResponse();
    }

    if (isPublicOfferRejectionLocked(link.quote.status, link.acceptedAt)) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "accepted_offer_reject_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
          quoteStatus: link.quote.status,
        },
      });

      return jsonError(
        "Eine bereits akzeptierte Offerte kann nicht abgelehnt werden.",
        409,
        {
          quoteStatus: link.quote.status,
        },
        rateLimit.headers,
      );
    }

    if (link.revokedAt) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "revoked_link_reject_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
        },
      });

      return createSafePublicGoneResponse(
        "Dieser Angebotslink ist nicht mehr aktiv.",
      );
    }

    if (isPublicOfferLinkExpired(link.expiresAt, now)) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "expired_link_reject_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
        },
      });

      return createSafePublicGoneResponse(
        "Dieser Angebotslink ist abgelaufen.",
      );
    }

    if (link.quote.validUntil && link.quote.validUntil.getTime() <= now.getTime()) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "expired_quote_reject_attempt",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteId: link.quote.id,
        },
      });

      return createSafePublicGoneResponse(
        "Die Gültigkeit der Offerte ist bereits abgelaufen.",
      );
    }

    if (isPublicOfferAlreadyRejected(link.quote.status)) {
      return jsonSuccess(
        {
          ok: true,
          message: "Diese Offerte wurde bereits abgelehnt.",
          offer: {
            quoteId: link.quote.id,
            quoteNumber: link.quote.quoteNumber,
            status: link.quote.status,
            customerName: serializeCustomerName(link.quote.customer),
          },
        },
        200,
        rateLimit.headers,
      );
    }

    if (isPublicOfferExpiredStatus(link.quote.status)) {
      return createSafePublicGoneResponse(
        "Diese Offerte ist nicht mehr verfügbar.",
      );
    }

    if (!canRejectPublicOffer(link.quote.status)) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_reject",
        reason: "quote_not_rejectable",
        severity: "warning",
        token: rawToken,
        extra: {
          linkId: link.id,
          quoteStatus: link.quote.status,
        },
      });

      return jsonError(
        "Diese Offerte kann im aktuellen Status nicht abgelehnt werden.",
        409,
        {
          quoteStatus: link.quote.status,
          requiredStatus: QuoteStatus.SENT,
        },
        rateLimit.headers,
      );
    }

    const rejectedQuote = await prisma.$transaction(async (tx) => {
      const updatedQuote = await tx.quote.update({
        where: {
          id: link.quote.id,
        },
        data: {
          status: QuoteStatus.REJECTED,
        },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
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
          action: AuditAction.STATUS_CHANGE,
          entityType: "Quote",
          entityId: updatedQuote.id,
          actorType: "customer_public_link",
          before: {
            status: link.quote.status,
            acceptedAt: link.quote.acceptedAt?.toISOString() ?? null,
          },
          after: {
            status: updatedQuote.status,
            acceptedAt: null,
            publicOfferLinkId: link.id,
          },
          message: `Offerte ${updatedQuote.quoteNumber} wurde vom Kunden über den öffentlichen Angebotslink abgelehnt.`,
          metadata: {
            rawTokenStored: false,
            tokenHashStoredOnly: true,
            source: "public_offer_link_reject",
            securityHardened: true,
            publicOfferLinkId: link.id,
            quoteId: updatedQuote.id,
            quoteNumber: updatedQuote.quoteNumber,
          },
        },
      });

      return updatedQuote;
    });

    return jsonSuccess(
      {
        ok: true,
        message: "Die Offerte wurde abgelehnt.",
        offer: {
          quoteId: rejectedQuote.id,
          quoteNumber: rejectedQuote.quoteNumber,
          status: rejectedQuote.status,
          customerName: serializeCustomerName(rejectedQuote.customer),
        },
      },
      200,
      rateLimit.headers,
    );
  } catch (error) {
    console.error("Public offer reject error:", error);

    return jsonError("Die Offerte konnte nicht abgelehnt werden.", 500);
  }
}