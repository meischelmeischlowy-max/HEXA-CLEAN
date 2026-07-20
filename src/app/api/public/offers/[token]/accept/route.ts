import { NextRequest, NextResponse } from "next/server";
import { AuditAction, PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPublicOfferTokenHash,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";
import {
  canAcceptPublicOffer,
  isPublicOfferAlreadyAccepted,
  isPublicOfferInactiveForAcceptance,
  normalizePublicOfferDecisionConfirmation,
} from "@/lib/public-offer-workflow";
import {
  checkPublicRateLimit,
  createPublicRateLimitResponse,
  createSafePublicGoneResponse,
  createSafePublicNotFoundResponse,
  logPublicSecurityEvent,
} from "@/lib/public-security";
import {
  sendInvoiceEmailWorkflow,
} from "@/lib/invoice-email-service";
import {
  dashboardRepository,
} from "@/repositories/dashboardRepository";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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


type AcceptedQuoteAutomationResult = {
  status:
    | "COMPLETED"
    | "ALREADY_COMPLETED"
    | "ACTION_REQUIRED";
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceCreated: boolean;
  emailSent: boolean;
  emailAlreadySent: boolean;
  actionRequired: boolean;
  message: string;
  error: string | null;
};

async function runAcceptedQuoteAutomation(
  quoteId: string,
): Promise<AcceptedQuoteAutomationResult> {
  try {
    const invoiceResult =
      await dashboardRepository
        .createInvoiceFromQuote(quoteId);

    if (!invoiceResult) {
      return {
        status: "ACTION_REQUIRED",
        invoiceId: null,
        invoiceNumber: null,
        invoiceCreated: false,
        emailSent: false,
        emailAlreadySent: false,
        actionRequired: true,
        message:
          "Die Offerte wurde akzeptiert, aber die Rechnung konnte nicht automatisch erstellt werden.",
        error: "INVOICE_CREATION_RETURNED_NULL",
      };
    }

    const emailResult =
      await sendInvoiceEmailWorkflow(
        invoiceResult.invoice.id,
      );

    return {
      status: emailResult.alreadySent
        ? "ALREADY_COMPLETED"
        : emailResult.ok
          ? "COMPLETED"
          : "ACTION_REQUIRED",
      invoiceId:
        invoiceResult.invoice.id,
      invoiceNumber:
        invoiceResult.invoice.invoiceNumber,
      invoiceCreated:
        invoiceResult.created,
      emailSent: emailResult.sent,
      emailAlreadySent:
        emailResult.alreadySent,
      actionRequired:
        emailResult.actionRequired,
      message: emailResult.message,
      error: emailResult.error ?? null,
    };
  } catch (error) {
    console.error(
      "Accepted quote automation error:",
      error,
    );

    return {
      status: "ACTION_REQUIRED",
      invoiceId: null,
      invoiceNumber: null,
      invoiceCreated: false,
      emailSent: false,
      emailAlreadySent: false,
      actionRequired: true,
      message:
        "Die Offerte wurde akzeptiert, aber die automatische Rechnungsverarbeitung ist fehlgeschlagen.",
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ACCEPTED_QUOTE_AUTOMATION_ERROR",
    };
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
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
    const confirmAcceptance = normalizePublicOfferDecisionConfirmation(body.confirmAcceptance, "accept");

    if (!confirmAcceptance) {
      logPublicSecurityEvent(request, {
        scope: "public_offer_accept",
        reason: "missing_acceptance_confirmation",
        severity: "info",
        token: rawToken,
      });

      return jsonError(
        "Die verbindliche Bestätigung der Offerte ist erforderlich.",
        400,
        {
          requiredField: "confirmAcceptance",
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

      return createSafePublicGoneResponse(
        "Dieser Angebotslink ist nicht mehr aktiv.",
      );
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

      return createSafePublicGoneResponse(
        "Dieser Angebotslink ist abgelaufen.",
      );
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

      return createSafePublicGoneResponse(
        "Die Gültigkeit der Offerte ist bereits abgelaufen.",
      );
    }

    if (
      isPublicOfferInactiveForAcceptance(link.quote.status)
    ) {
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

      return createSafePublicGoneResponse(
        "Diese Offerte ist nicht mehr verfügbar.",
      );
    }

    if (
      isPublicOfferAlreadyAccepted(
        link.quote.status,
        link.quote.acceptedAt,
      )
    ) {
      const automation =
        await runAcceptedQuoteAutomation(
          link.quote.id,
        );

      return jsonSuccess(
        {
          ok: true,
          message:
            "Diese Offerte wurde bereits akzeptiert.",
          offer: {
            quoteId: link.quote.id,
            quoteNumber:
              link.quote.quoteNumber,
            status: link.quote.status,
            acceptedAt:
              link.quote.acceptedAt?.toISOString() ??
              null,
            customerName:
              serializeCustomerName(
                link.quote.customer,
              ),
          },
          automation,
        },
        200,
        rateLimit.headers,
      );
    }

    if (!canAcceptPublicOffer(link.quote.status)) {
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

      return jsonError(
        "Diese Offerte kann im aktuellen Status nicht akzeptiert werden.",
        409,
        {
          quoteStatus: link.quote.status,
          requiredStatus: QuoteStatus.SENT,
        },
        rateLimit.headers,
      );
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
            acceptedAt: updatedQuote.acceptedAt?.toISOString() ?? null,
            publicOfferLinkId: link.id,
          },
          message: `Offerte ${updatedQuote.quoteNumber} wurde vom Kunden über den öffentlichen Angebotslink akzeptiert.`,
          metadata: {
            rawTokenStored: false,
            tokenHashStoredOnly: true,
            source: "public_offer_link_accept",
            securityHardened: true,
            publicOfferLinkId: link.id,
            quoteId: updatedQuote.id,
            quoteNumber: updatedQuote.quoteNumber,
          },
        },
      });

      return updatedQuote;
    });

    const automation =
      await runAcceptedQuoteAutomation(
        acceptedQuote.id,
      );

    return jsonSuccess(
      {
        ok: true,
        message: "Die Offerte wurde erfolgreich akzeptiert.",
        offer: {
          quoteId: acceptedQuote.id,
          quoteNumber: acceptedQuote.quoteNumber,
          status: acceptedQuote.status,
          acceptedAt: acceptedQuote.acceptedAt?.toISOString() ?? null,
          customerName: serializeCustomerName(acceptedQuote.customer),
        },
        automation,
      },
      200,
      rateLimit.headers,
    );
  } catch (error) {
    console.error("Public offer accept error:", error);

    return jsonError(
      "Die Offerte konnte nicht akzeptiert werden.",
      500,
    );
  }
}