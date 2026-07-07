import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

function isDashboardRequestAuthorized(request: NextRequest) {
  const dashboardToken = process.env.DASHBOARD_AUTH_TOKEN;

  if (!dashboardToken) {
    return {
      ok: false,
      reason: "missing_dashboard_token",
    };
  }

  const authorizationHeader = request.headers.get("authorization");
  const bearerToken = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (bearerToken && bearerToken === dashboardToken) {
    return {
      ok: true,
      reason: "authorization_header",
    };
  }

  const hasMatchingCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.value === dashboardToken);

  if (hasMatchingCookie) {
    return {
      ok: true,
      reason: "dashboard_cookie",
    };
  }

  return {
    ok: false,
    reason: "unauthorized",
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; linkId: string }> },
) {
  const auth = isDashboardRequestAuthorized(request);

  if (!auth.ok) {
    return jsonError("Unauthorized dashboard request.", 401, {
      reason: auth.reason,
    });
  }

  const { id, linkId } = await context.params;
  const quoteId = normalizeUuid(id);
  const publicOfferLinkId = normalizeUuid(linkId);

  if (!quoteId) {
    return jsonError("Invalid quote id.", 400);
  }

  if (!publicOfferLinkId) {
    return jsonError("Invalid public offer link id.", 400);
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
      customerId: true,
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
          status: true,
        },
      },
    },
  });

  if (!link) {
    return jsonError("Public offer link not found.", 404);
  }

  if (link.acceptedAt) {
    return jsonError("Accepted public offer link cannot be revoked.", 409, {
      acceptedAt: link.acceptedAt.toISOString(),
    });
  }

  if (link.revokedAt) {
    return NextResponse.json({
      ok: true,
      message: "Public offer link was already revoked.",
      link: {
        id: link.id,
        quoteId: link.quoteId,
        tokenPrefix: link.tokenPrefix,
        expiresAt: link.expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: link.revokedAt.toISOString(),
        isActive: false,
      },
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
        action: "UPDATE",
        entityType: "PublicOfferLink",
        entityId: link.id,
        actorType: "dashboard",
        before: {
          revokedAt: null,
          tokenPrefix: link.tokenPrefix,
          quoteId: link.quoteId,
          quoteNumber: link.quote.quoteNumber,
        },
        after: {
          revokedAt: now.toISOString(),
          tokenPrefix: link.tokenPrefix,
          quoteId: link.quoteId,
          quoteNumber: link.quote.quoteNumber,
        },
        message: `Public offer link for quote ${link.quote.quoteNumber} was revoked from dashboard.`,
        metadata: {
          source: "dashboard_public_offer_link_management",
          rawTokenStored: false,
        },
      },
    });

    return updatedLink;
  });

  return NextResponse.json({
    ok: true,
    message: "Public offer link revoked.",
    link: {
      id: revokedLink.id,
      quoteId: revokedLink.quoteId,
      tokenPrefix: revokedLink.tokenPrefix,
      expiresAt: revokedLink.expiresAt.toISOString(),
      acceptedAt: revokedLink.acceptedAt?.toISOString() ?? null,
      revokedAt: revokedLink.revokedAt?.toISOString() ?? null,
      lastViewedAt: revokedLink.lastViewedAt?.toISOString() ?? null,
      viewCount: revokedLink.viewCount,
      createdAt: revokedLink.createdAt.toISOString(),
      updatedAt: revokedLink.updatedAt.toISOString(),
      isActive: false,
    },
  });
}