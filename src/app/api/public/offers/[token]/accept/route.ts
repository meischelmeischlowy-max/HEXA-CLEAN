import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, QuoteStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createPublicOfferTokenHash,
  isPublicOfferLinkExpired,
  normalizePublicOfferToken,
} from "@/lib/public-offer-links";

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

  if (!rawToken) {
    return jsonError("Offer link is not available.", 404);
  }

  const body = await readJsonObject(request);
  const confirmAcceptance = normalizeAcceptanceValue(body.confirmAcceptance);

  if (!confirmAcceptance) {
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
    return jsonError("Offer link is not available.", 404);
  }

  if (link.revokedAt) {
    return jsonError("Offer link is no longer active.", 410);
  }

  if (isPublicOfferLinkExpired(link.expiresAt, now)) {
    return jsonError("Offer link has expired.", 410);
  }

  if (link.quote.validUntil && link.quote.validUntil.getTime() <= now.getTime()) {
    return jsonError("Offer validity date has already expired.", 410);
  }

  if (link.quote.status === QuoteStatus.REJECTED || link.quote.status === QuoteStatus.EXPIRED) {
    return jsonError("Offer is no longer available.", 410);
  }

  if (link.quote.status === QuoteStatus.ACCEPTED && link.quote.acceptedAt) {
    return NextResponse.json({
      ok: true,
      message: "Offer was already accepted.",
      offer: {
        quoteId: link.quote.id,
        quoteNumber: link.quote.quoteNumber,
        status: link.quote.status,
        acceptedAt: link.quote.acceptedAt.toISOString(),
        customerName: serializeCustomerName(link.quote.customer),
      },
    });
  }

  if (link.quote.status !== QuoteStatus.SENT) {
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
        },
      },
    });

    return updatedQuote;
  });

  return NextResponse.json({
    ok: true,
    message: "Offer accepted successfully.",
    offer: {
      quoteId: acceptedQuote.id,
      quoteNumber: acceptedQuote.quoteNumber,
      status: acceptedQuote.status,
      acceptedAt: acceptedQuote.acceptedAt?.toISOString() ?? null,
      customerName: serializeCustomerName(acceptedQuote.customer),
    },
  });
}