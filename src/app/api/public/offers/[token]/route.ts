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

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    { status },
  );
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
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const rawToken = normalizePublicOfferToken(token);

  if (!rawToken) {
    return jsonError("Offer link is not available.", 404);
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
    return jsonError("Offer link is not available.", 404);
  }

  if (link.revokedAt) {
    return jsonError("Offer link is no longer active.", 410);
  }

  if (isPublicOfferLinkExpired(link.expiresAt, now)) {
    return jsonError("Offer link has expired.", 410);
  }

  if (link.quote.status === QuoteStatus.REJECTED || link.quote.status === QuoteStatus.EXPIRED) {
    return jsonError("Offer is no longer available.", 410);
  }

  if (link.quote.status !== QuoteStatus.SENT && link.quote.status !== QuoteStatus.ACCEPTED) {
    return jsonError("Offer is not available for public viewing.", 404);
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

  return NextResponse.json({
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
      items: serializeJsonValue(link.quote.items),
      notes: link.quote.notes,
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
  });
}