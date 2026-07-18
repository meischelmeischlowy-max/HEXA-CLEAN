import { NextRequest, NextResponse } from "next/server";
import { isDashboardRequestAuthorized } from "@/lib/dashboard-auth";
import { AuditAction, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function jsonError(
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      ok: false,
      message,
      ...(details ? { details } : {}),
    },
    {
      status,
      headers: responseHeaders(),
    },
  );
}

function jsonSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: responseHeaders(),
  });
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!UUID_PATTERN.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}


function serializeRevokedLink(link: {
  id: string;
  quoteId: string;
  tokenPrefix: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  lastViewedAt?: Date | null;
  viewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: link.id,
    quoteId: link.quoteId,
    tokenPrefix: link.tokenPrefix,
    expiresAt: link.expiresAt.toISOString(),
    acceptedAt: link.acceptedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    lastViewedAt: link.lastViewedAt?.toISOString() ?? null,
    viewCount: link.viewCount ?? 0,
    createdAt: link.createdAt?.toISOString() ?? null,
    updatedAt: link.updatedAt?.toISOString() ?? null,
    isActive: false,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    if (!(await isDashboardRequestAuthorized(request))) {
      return jsonError("Nicht autorisierte Dashboard-Anfrage.", 401);
    }

    const { id, linkId } = await context.params;
    const quoteId = normalizeUuid(id);
    const publicOfferLinkId = normalizeUuid(linkId);

    if (!quoteId) {
      return jsonError("Ungültige Angebots-ID.", 400);
    }

    if (!publicOfferLinkId) {
      return jsonError("Ungültige Public-Link-ID.", 400);
    }

    const prisma = getPrisma();
    const now = new Date();

    const link = await prisma.publicOfferLink.findFirst({
      where: {
        id: publicOfferLinkId,
        quoteId,
      },
      select: {
        id: true,
        quoteId: true,
        tokenPrefix: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            customerId: true,
            orderId: true,
            sessionId: true,
          },
        },
      },
    });

    if (!link) {
      return jsonError("Der öffentliche Angebotslink wurde nicht gefunden.", 404);
    }

    if (link.acceptedAt) {
      return jsonError(
        "Ein bereits akzeptierter öffentlicher Angebotslink kann nicht deaktiviert werden.",
        409,
        {
          acceptedAt: link.acceptedAt.toISOString(),
        },
      );
    }

    if (link.revokedAt) {
      return jsonSuccess({
        ok: true,
        message: "Der öffentliche Angebotslink war bereits deaktiviert.",
        link: serializeRevokedLink({
          id: link.id,
          quoteId: link.quoteId,
          tokenPrefix: link.tokenPrefix,
          expiresAt: link.expiresAt,
          acceptedAt: link.acceptedAt,
          revokedAt: link.revokedAt,
        }),
      });
    }

    const revokedLink = await prisma.$transaction(async (tx) => {
      const updatedLink = await tx.publicOfferLink.update({
        where: {
          id: link.id,
        },
        data: {
          revokedAt: now,
        },
        select: {
          id: true,
          quoteId: true,
          tokenPrefix: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          lastViewedAt: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: link.quote.customerId,
          orderId: link.quote.orderId,
          sessionId: link.quote.sessionId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "PublicOfferLink",
          entityId: link.id,
          actorType: "dashboard",
          before: {
            revokedAt: null,
            tokenPrefix: link.tokenPrefix,
            quoteId: link.quoteId,
            quoteNumber: link.quote.quoteNumber,
            isActive: true,
          },
          after: {
            revokedAt: now.toISOString(),
            tokenPrefix: link.tokenPrefix,
            quoteId: link.quoteId,
            quoteNumber: link.quote.quoteNumber,
            isActive: false,
          },
          message: `Öffentlicher Angebotslink für Angebot ${link.quote.quoteNumber} wurde im Dashboard deaktiviert.`,
          metadata: {
            source: "dashboard_public_offer_link_revoke",
            quoteId: link.quoteId,
            quoteNumber: link.quote.quoteNumber,
            publicOfferLinkId: link.id,
            tokenPrefix: link.tokenPrefix,
            rawTokenStored: false,
            fullPublicUrlStored: false,
          },
        },
      });

      return updatedLink;
    });

    return jsonSuccess({
      ok: true,
      message: "Der öffentliche Angebotslink wurde deaktiviert.",
      link: serializeRevokedLink(revokedLink),
    });
  } catch (error) {
    console.error("Public offer link revoke error:", error);

    return jsonError(
      "Der öffentliche Angebotslink konnte nicht deaktiviert werden.",
      500,
    );
  }
}