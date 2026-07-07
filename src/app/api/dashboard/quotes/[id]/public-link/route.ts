import { NextRequest, NextResponse } from "next/server";
import {
  AuditAction,
  NotificationChannel,
  NotificationStatus,
  PrismaClient,
  QuoteStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildPublicOfferUrl,
  createPublicOfferTokenData,
  isPublicOfferLinkExpired,
} from "@/lib/public-offer-links";

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

function normalizeExpiresInDays(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 14;
  }

  if (value < 1) {
    return 1;
  }

  if (value > 90) {
    return 90;
  }

  return Math.floor(value);
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function serializePublicOfferLink(link: {
  id: string;
  tokenPrefix: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  lastViewedAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const now = new Date();
  const isExpired = isPublicOfferLinkExpired(link.expiresAt, now);
  const isActive = !link.revokedAt && !link.acceptedAt && !isExpired;

  return {
    id: link.id,
    tokenPrefix: link.tokenPrefix,
    expiresAt: link.expiresAt.toISOString(),
    acceptedAt: link.acceptedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    lastViewedAt: link.lastViewedAt?.toISOString() ?? null,
    viewCount: link.viewCount,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    isExpired,
    isActive,
  };
}

function buildMaskedPublicOfferUrl(
  publicUrl: string,
  rawToken: string,
  tokenPrefix: string,
) {
  return publicUrl.replace(rawToken, `${tokenPrefix}...`);
}

function buildOfferEmailSubject(quoteNumber: string) {
  return `Ihre Offerte ${quoteNumber} von HEXA CLEAN`;
}

function buildOfferEmailLogMessage(maskedPublicUrl: string) {
  return [
    "Guten Tag",
    "",
    "vielen Dank für Ihre Anfrage.",
    "",
    "Ihre Offerte wurde als öffentlicher Kundenlink vorbereitet.",
    "",
    "Geschützter Link:",
    maskedPublicUrl,
    "",
    "Hinweis: Aus Sicherheitsgründen wird der vollständige Token nicht in der Datenbank gespeichert.",
    "",
    "Freundliche Grüsse",
    "HEXA CLEAN",
  ].join("\n");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = isDashboardRequestAuthorized(request);

    if (!auth.ok) {
      return jsonError("Nicht autorisierte Dashboard-Anfrage.", 401, {
        reason: auth.reason,
      });
    }

    const { id } = await context.params;
    const quoteId = normalizeUuid(id);

    if (!quoteId) {
      return jsonError("Ungültige Angebots-ID.", 400);
    }

    const prisma = getPrisma();

    const quote = await prisma.quote.findUnique({
      where: {
        id: quoteId,
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        validUntil: true,
        sentAt: true,
        acceptedAt: true,
        customer: {
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
        publicOfferLinks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          select: {
            id: true,
            tokenPrefix: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            lastViewedAt: true,
            viewCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!quote) {
      return jsonError("Das Angebot wurde nicht gefunden.", 404);
    }

    return NextResponse.json(
      {
        ok: true,
        quote: {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          validUntil: quote.validUntil?.toISOString() ?? null,
          sentAt: quote.sentAt?.toISOString() ?? null,
          acceptedAt: quote.acceptedAt?.toISOString() ?? null,
          customer: quote.customer,
        },
        links: quote.publicOfferLinks.map(serializePublicOfferLink),
        securityNote:
          "Vollständige Public-Offer-Tokens werden nie gespeichert und können später nicht erneut angezeigt werden. Erstellen Sie einen neuen Link, wenn der Kunde die URL verloren hat.",
      },
      {
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Public offer link list error:", error);

    return jsonError(
      "Die öffentlichen Angebotslinks konnten nicht geladen werden.",
      500,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = isDashboardRequestAuthorized(request);

    if (!auth.ok) {
      return jsonError("Nicht autorisierte Dashboard-Anfrage.", 401, {
        reason: auth.reason,
      });
    }

    const { id } = await context.params;
    const quoteId = normalizeUuid(id);

    if (!quoteId) {
      return jsonError("Ungültige Angebots-ID.", 400);
    }

    const body = await readJsonObject(request);
    const expiresInDays = normalizeExpiresInDays(body.expiresInDays);
    const revokeExisting = normalizeBoolean(body.revokeExisting, true);

    const prisma = getPrisma();

    const quote = await prisma.quote.findUnique({
      where: {
        id: quoteId,
      },
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
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    });

    if (!quote) {
      return jsonError("Das Angebot wurde nicht gefunden.", 404);
    }

    if (quote.status === QuoteStatus.ACCEPTED) {
      return jsonError("Das Angebot wurde bereits akzeptiert.", 409, {
        quoteStatus: quote.status,
      });
    }

    if (quote.status !== QuoteStatus.SENT) {
      return jsonError(
        "Ein öffentlicher Angebotslink kann nur für ein versendetes Angebot erstellt werden.",
        409,
        {
          quoteStatus: quote.status,
          requiredStatus: QuoteStatus.SENT,
        },
      );
    }

    const now = new Date();

    if (quote.validUntil && quote.validUntil.getTime() <= now.getTime()) {
      return jsonError("Die Gültigkeit des Angebots ist bereits abgelaufen.", 409, {
        validUntil: quote.validUntil.toISOString(),
      });
    }

    const tokenData = createPublicOfferTokenData(expiresInDays);
    const publicUrl = buildPublicOfferUrl(tokenData.rawToken);
    const maskedPublicUrl = buildMaskedPublicOfferUrl(
      publicUrl,
      tokenData.rawToken,
      tokenData.tokenPrefix,
    );

    const finalExpiresAt =
      quote.validUntil && quote.validUntil.getTime() < tokenData.expiresAt.getTime()
        ? quote.validUntil
        : tokenData.expiresAt;

    const result = await prisma.$transaction(async (tx) => {
      if (revokeExisting) {
        await tx.publicOfferLink.updateMany({
          where: {
            quoteId: quote.id,
            acceptedAt: null,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });
      }

      const link = await tx.publicOfferLink.create({
        data: {
          tokenHash: tokenData.tokenHash,
          tokenPrefix: tokenData.tokenPrefix,
          quoteId: quote.id,
          customerId: quote.customerId,
          expiresAt: finalExpiresAt,
          createdBy: "dashboard",
          metadata: {
            expiresInDays,
            revokeExisting,
            rawTokenStored: false,
            fullPublicUrlStored: false,
            maskedPublicUrl,
          },
        },
        select: {
          id: true,
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

      const notification = quote.customer.email
        ? await tx.notification.create({
            data: {
              customerId: quote.customerId,
              orderId: quote.orderId,
              sessionId: quote.sessionId,
              channel: NotificationChannel.EMAIL,
              status: NotificationStatus.PENDING,
              recipient: quote.customer.email,
              subject: buildOfferEmailSubject(quote.quoteNumber),
              message: buildOfferEmailLogMessage(maskedPublicUrl),
              metadata: {
                source: "public_offer_link_generation",
                quoteId: quote.id,
                quoteNumber: quote.quoteNumber,
                publicOfferLinkId: link.id,
                tokenPrefix: tokenData.tokenPrefix,
                maskedPublicUrl,
                rawTokenStored: false,
                fullPublicUrlStored: false,
                draftOnly: true,
                requiresManualSend: true,
              },
            },
            select: {
              id: true,
              recipient: true,
              subject: true,
              status: true,
              createdAt: true,
            },
          })
        : null;

      await tx.auditLog.create({
        data: {
          customerId: quote.customerId,
          orderId: quote.orderId,
          sessionId: quote.sessionId,
          action: AuditAction.CREATE,
          entityType: "PublicOfferLink",
          entityId: link.id,
          actorType: "dashboard",
          message: `Öffentlicher Angebotslink für Angebot ${quote.quoteNumber} wurde erstellt.`,
          after: {
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            tokenPrefix: tokenData.tokenPrefix,
            expiresAt: finalExpiresAt.toISOString(),
            rawTokenStored: false,
            fullPublicUrlStored: false,
            previousOpenLinksRevoked: revokeExisting,
            notificationCreated: Boolean(notification),
            notificationId: notification?.id ?? null,
            maskedPublicUrl,
          },
          metadata: {
            source: "public_offer_link_api",
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            publicOfferLinkId: link.id,
            tokenPrefix: tokenData.tokenPrefix,
            rawTokenStored: false,
            fullPublicUrlStored: false,
          },
        },
      });

      return {
        link,
        notification,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        message:
          "Der öffentliche Angebotslink wurde erstellt. Kopieren Sie diese URL jetzt, da der vollständige Token nicht gespeichert wird.",
        publicUrl,
        rawTokenShownOnce: true,
        link: serializePublicOfferLink(result.link),
        notification: result.notification
          ? {
              id: result.notification.id,
              recipient: result.notification.recipient,
              subject: result.notification.subject,
              status: result.notification.status,
              createdAt: result.notification.createdAt.toISOString(),
              rawTokenStored: false,
              fullPublicUrlStored: false,
            }
          : null,
        notificationNote: result.notification
          ? "Eine E-Mail-Notification mit Status PENDING wurde erstellt. Sie enthält nur die maskierte URL."
          : "Es wurde keine Notification erstellt, weil der Kunde keine E-Mail-Adresse hat.",
      },
      {
        status: 201,
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Public offer link generation error:", error);

    return jsonError(
      "Der öffentliche Angebotslink konnte nicht erstellt werden.",
      500,
    );
  }
}