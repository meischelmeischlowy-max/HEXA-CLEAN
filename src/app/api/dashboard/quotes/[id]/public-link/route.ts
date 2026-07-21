import { NextRequest, NextResponse } from "next/server";
import { getDashboardAuthorization } from "@/lib/dashboard-auth";
import {
  emailConfiguration,
  resend,
} from "@/lib/email-config";
import {
  buildQuoteEmailHtml,
  buildQuoteEmailSubject,
  buildQuoteEmailText,
  quoteNotificationMatches,
} from "@/lib/quote-email";
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

function normalizeEmail(
  value?: string | null,
) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function customerDisplayName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  if (customer.companyName?.trim()) {
    return customer.companyName.trim();
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    customer.email ||
    "Kundin / Kunde"
  );
}

function decimalToNumber(
  value: unknown,
) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(
      value.toString(),
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function errorMessage(
  value: unknown,
) {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return String(
    value || "Unbekannter E-Mail-Fehler",
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getDashboardAuthorization(request);

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
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth =
      await getDashboardAuthorization(
        request,
      );

    if (!auth.ok) {
      return jsonError(
        "Nicht autorisierte Dashboard-Anfrage.",
        401,
        {
          reason: auth.reason,
        },
      );
    }

    const { id } =
      await context.params;

    const quoteId =
      normalizeUuid(id);

    if (!quoteId) {
      return jsonError(
        "Ungültige Angebots-ID.",
        400,
      );
    }

    const body =
      await readJsonObject(
        request,
      );

    const expiresInDays =
      normalizeExpiresInDays(
        body.expiresInDays,
      );

    const revokeExisting =
      normalizeBoolean(
        body.revokeExisting,
        true,
      );

    const prisma = getPrisma();

    const quote =
      await prisma.quote.findUnique({
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
          total: true,
          currency: true,
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
      return jsonError(
        "Das Angebot wurde nicht gefunden.",
        404,
      );
    }

    const currentQuote = quote;

    if (
      currentQuote.status ===
      QuoteStatus.ACCEPTED
    ) {
      return jsonError(
        "Das Angebot wurde bereits akzeptiert.",
        409,
        {
          quoteStatus:
            currentQuote.status,
        },
      );
    }

    if (
      currentQuote.status !==
        QuoteStatus.DRAFT &&
      currentQuote.status !==
        QuoteStatus.SENT
    ) {
      return jsonError(
        "Nur ein Entwurf kann an den Kunden versendet werden.",
        409,
        {
          quoteStatus:
            currentQuote.status,
          requiredStatus:
            QuoteStatus.DRAFT,
        },
      );
    }

    const now = new Date();

    if (
      currentQuote.validUntil &&
      currentQuote.validUntil.getTime() <=
        now.getTime()
    ) {
      return jsonError(
        "Die Gültigkeit des Angebots ist bereits abgelaufen.",
        409,
        {
          validUntil:
            currentQuote.validUntil.toISOString(),
        },
      );
    }

    const sentCandidates =
      await prisma.notification.findMany({
        where: {
          customerId:
            currentQuote.customerId,
          orderId:
            currentQuote.orderId,
          channel:
            NotificationChannel.EMAIL,
          status:
            NotificationStatus.SENT,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      });

    const existingSentNotification =
      sentCandidates.find(
        (notification) =>
          quoteNotificationMatches(
            notification.metadata,
            currentQuote.id,
          ),
      ) ?? null;

    if (existingSentNotification) {
      if (
        currentQuote.status !==
        QuoteStatus.SENT
      ) {
        await prisma.quote.update({
          where: {
            id: currentQuote.id,
          },
          data: {
            status:
              QuoteStatus.SENT,
            sentAt:
              currentQuote.sentAt ??
              existingSentNotification.sentAt ??
              now,
            validUntil:
              currentQuote.validUntil ??
              new Date(
                now.getTime() +
                  14 * 24 * 60 * 60 * 1000,
              ),
          },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          alreadySent: true,
          message:
            "Die Offerte wurde bereits per E-Mail versendet.",
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          recipient:
            existingSentNotification.recipient,
          notificationId:
            existingSentNotification.id,
        },
        {
          status: 200,
          headers:
            responseHeaders(),
        },
      );
    }

    const recipient =
      normalizeEmail(
        currentQuote.customer.email,
      );

    async function recordBlockingFailure({
      message,
      error,
      statusCode,
    }: {
      message: string;
      error: string;
      statusCode: number;
    }) {
      const notification =
        await prisma.notification.create({
          data: {
            customerId:
              currentQuote.customerId,
            orderId:
              currentQuote.orderId,
            sessionId:
              currentQuote.sessionId,
            channel:
              NotificationChannel.EMAIL,
            status:
              NotificationStatus.FAILED,
            recipient:
              recipient ||
              emailConfiguration.ownerEmail,
            subject:
              `Offertenversand fehlgeschlagen: ${currentQuote.quoteNumber}`,
            message,
            errorMessage:
              error,
            metadata: {
              source:
                "automatic_quote_email",
              type:
                "customer_quote",
              quoteId:
                currentQuote.id,
              quoteNumber:
                currentQuote.quoteNumber,
              automatic: true,
              actionRequired: true,
              error,
            },
          },
        });

      await prisma.auditLog.create({
        data: {
          customerId:
            currentQuote.customerId,
          orderId:
            currentQuote.orderId,
          sessionId:
            currentQuote.sessionId,
          action:
            AuditAction.SYSTEM,
          entityType:
            "Quote",
          entityId:
            currentQuote.id,
          actorType:
            "dashboard",
          message,
          after: {
            quoteId:
              currentQuote.id,
            quoteNumber:
              currentQuote.quoteNumber,
            quoteStatus:
              currentQuote.status,
            emailSent: false,
            notificationId:
              notification.id,
            actionRequired: true,
            error,
          },
          metadata: {
            source:
              "automatic_quote_email",
            quoteId:
              currentQuote.id,
            automatic: true,
            actionRequired: true,
          },
        },
      });

      return jsonError(
        message,
        statusCode,
        {
          error,
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          notificationId:
            notification.id,
        },
      );
    }

    if (!recipient) {
      return recordBlockingFailure({
        message:
          "Die Offerte konnte nicht versendet werden, weil keine gültige Kunden-E-Mail vorhanden ist.",
        error:
          "CUSTOMER_EMAIL_MISSING_OR_INVALID",
        statusCode: 409,
      });
    }

    if (!resend) {
      return recordBlockingFailure({
        message:
          "Der Offertenversand ist nicht konfiguriert.",
        error:
          "RESEND_API_KEY is missing",
        statusCode: 503,
      });
    }

    const tokenData =
      createPublicOfferTokenData(
        expiresInDays,
      );

    const publicUrl =
      buildPublicOfferUrl(
        tokenData.rawToken,
      );

    const maskedPublicUrl =
      buildMaskedPublicOfferUrl(
        publicUrl,
        tokenData.rawToken,
        tokenData.tokenPrefix,
      );

    const finalExpiresAt =
      currentQuote.validUntil &&
      currentQuote.validUntil.getTime() <
        tokenData.expiresAt.getTime()
        ? currentQuote.validUntil
        : tokenData.expiresAt;

    const effectiveValidUntil =
      currentQuote.validUntil ??
      finalExpiresAt;

    const subject =
      buildQuoteEmailSubject(
        currentQuote.quoteNumber,
      );

    const emailPayload = {
      quoteNumber:
        currentQuote.quoteNumber,
      customerName:
        customerDisplayName(
          currentQuote.customer,
        ),
      total:
        decimalToNumber(
          currentQuote.total,
        ),
      currency:
        currentQuote.currency || "CHF",
      publicUrl,
      validUntil:
        effectiveValidUntil,
    };

    const text =
      buildQuoteEmailText(
        emailPayload,
      );

    const html =
      buildQuoteEmailHtml(
        emailPayload,
      );

    const prepared =
      await prisma.$transaction(
        async (tx) => {
          if (revokeExisting) {
            await tx.publicOfferLink.updateMany({
              where: {
                quoteId:
                  currentQuote.id,
                acceptedAt: null,
                revokedAt: null,
              },
              data: {
                revokedAt: now,
              },
            });
          }

          const link =
            await tx.publicOfferLink.create({
              data: {
                tokenHash:
                  tokenData.tokenHash,
                tokenPrefix:
                  tokenData.tokenPrefix,
                quoteId:
                  currentQuote.id,
                customerId:
                  currentQuote.customerId,
                expiresAt:
                  finalExpiresAt,
                createdBy:
                  "dashboard",
                metadata: {
                  source:
                    "automatic_quote_email",
                  expiresInDays,
                  revokeExisting,
                  rawTokenStored:
                    false,
                  fullPublicUrlStored:
                    false,
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

          const notification =
            await tx.notification.create({
              data: {
                customerId:
                  currentQuote.customerId,
                orderId:
                  currentQuote.orderId,
                sessionId:
                  currentQuote.sessionId,
                channel:
                  NotificationChannel.EMAIL,
                status:
                  NotificationStatus.PENDING,
                recipient,
                subject,
                message: [
                  `Offerte ${currentQuote.quoteNumber}`,
                  `Empfänger: ${recipient}`,
                  `Geschützter Link: ${maskedPublicUrl}`,
                  "Der vollständige Token wird nicht gespeichert.",
                ].join("\n"),
                metadata: {
                  source:
                    "automatic_quote_email",
                  type:
                    "customer_quote",
                  quoteId:
                    currentQuote.id,
                  quoteNumber:
                    currentQuote.quoteNumber,
                  publicOfferLinkId:
                    link.id,
                  tokenPrefix:
                    tokenData.tokenPrefix,
                  maskedPublicUrl,
                  rawTokenStored:
                    false,
                  fullPublicUrlStored:
                    false,
                  automatic: true,
                  actionRequired:
                    false,
                },
              },
            });

          await tx.auditLog.create({
            data: {
              customerId:
                currentQuote.customerId,
              orderId:
                currentQuote.orderId,
              sessionId:
                currentQuote.sessionId,
              action:
                AuditAction.CREATE,
              entityType:
                "PublicOfferLink",
              entityId:
                link.id,
              actorType:
                "dashboard",
              message:
                `Geschützter Kundenlink für Offerte ${currentQuote.quoteNumber} wurde für den automatischen Versand erstellt.`,
              after: {
                quoteId:
                  currentQuote.id,
                quoteNumber:
                  currentQuote.quoteNumber,
                publicOfferLinkId:
                  link.id,
                tokenPrefix:
                  tokenData.tokenPrefix,
                expiresAt:
                  finalExpiresAt.toISOString(),
                notificationId:
                  notification.id,
                rawTokenStored:
                  false,
                fullPublicUrlStored:
                  false,
              },
              metadata: {
                source:
                  "automatic_quote_email",
                quoteId:
                  currentQuote.id,
                automatic: true,
              },
            },
          });

          return {
            link,
            notification,
          };
        },
      );

    let providerMessageId:
      string | null = null;

    let sendError:
      string | null = null;

    try {
      const result =
        await resend.emails.send({
          from:
            emailConfiguration.from,
          replyTo:
            emailConfiguration.replyTo,
          to: [recipient],
          subject,
          html,
          text,
        });

      if (result.error) {
        sendError =
          result.error.message ||
          JSON.stringify(
            result.error,
          );
      } else {
        providerMessageId =
          result.data?.id ?? null;
      }
    } catch (error) {
      sendError =
        errorMessage(error);
    }

    if (sendError) {
      const failedAt =
        new Date();

      await prisma.$transaction([
        prisma.notification.update({
          where: {
            id:
              prepared.notification.id,
          },
          data: {
            status:
              NotificationStatus.FAILED,
            sentAt: null,
            errorMessage:
              sendError,
            metadata: {
              source:
                "automatic_quote_email",
              type:
                "customer_quote",
              quoteId:
                currentQuote.id,
              quoteNumber:
                currentQuote.quoteNumber,
              publicOfferLinkId:
                prepared.link.id,
              tokenPrefix:
                tokenData.tokenPrefix,
              maskedPublicUrl,
              rawTokenStored:
                false,
              fullPublicUrlStored:
                false,
              automatic: true,
              actionRequired: true,
              error:
                sendError,
            },
          },
        }),

        prisma.publicOfferLink.update({
          where: {
            id:
              prepared.link.id,
          },
          data: {
            revokedAt:
              failedAt,
          },
        }),

        prisma.auditLog.create({
          data: {
            customerId:
              currentQuote.customerId,
            orderId:
              currentQuote.orderId,
            sessionId:
              currentQuote.sessionId,
            action:
              AuditAction.SYSTEM,
            entityType:
              "Quote",
            entityId:
              currentQuote.id,
            actorType:
              "dashboard",
            message:
              `Automatischer E-Mail-Versand der Offerte ${currentQuote.quoteNumber} ist fehlgeschlagen.`,
            after: {
              quoteId:
                currentQuote.id,
              quoteNumber:
                currentQuote.quoteNumber,
              quoteStatus:
                currentQuote.status,
              emailSent: false,
              recipient,
              notificationId:
                prepared.notification.id,
              publicOfferLinkId:
                prepared.link.id,
              publicOfferLinkRevoked:
                true,
              actionRequired: true,
              error:
                sendError,
            },
            metadata: {
              source:
                "automatic_quote_email",
              quoteId:
                currentQuote.id,
              automatic: true,
              actionRequired: true,
            },
          },
        }),
      ]);

      return jsonError(
        "Die Offerte wurde nicht als versendet markiert, weil der E-Mail-Provider den Versand nicht bestätigt hat.",
        502,
        {
          error:
            sendError,
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          recipient,
          notificationId:
            prepared.notification.id,
        },
      );
    }

    const sentAt =
      new Date();

    await prisma.$transaction([
      prisma.notification.update({
        where: {
          id:
            prepared.notification.id,
        },
        data: {
          status:
            NotificationStatus.SENT,
          sentAt,
          errorMessage: null,
          metadata: {
            source:
              "automatic_quote_email",
            type:
              "customer_quote",
            quoteId:
              currentQuote.id,
            quoteNumber:
              currentQuote.quoteNumber,
            publicOfferLinkId:
              prepared.link.id,
            tokenPrefix:
              tokenData.tokenPrefix,
            maskedPublicUrl,
            rawTokenStored:
              false,
            fullPublicUrlStored:
              false,
            automatic: true,
            actionRequired: false,
            providerMessageId,
          },
        },
      }),

      prisma.quote.update({
        where: {
          id:
            currentQuote.id,
        },
        data: {
          status:
            QuoteStatus.SENT,
          sentAt,
          validUntil:
            effectiveValidUntil,
        },
      }),

      prisma.auditLog.create({
        data: {
          customerId:
            currentQuote.customerId,
          orderId:
            currentQuote.orderId,
          sessionId:
            currentQuote.sessionId,
          action:
            AuditAction.SYSTEM,
          entityType:
            "Quote",
          entityId:
            currentQuote.id,
          actorType:
            "dashboard",
          message:
            `Offerte ${currentQuote.quoteNumber} wurde per E-Mail an ${recipient} übergeben.`,
          before: {
            quoteStatus:
              currentQuote.status,
            sentAt:
              currentQuote.sentAt?.toISOString() ??
              null,
          },
          after: {
            quoteStatus:
              QuoteStatus.SENT,
            sentAt:
              sentAt.toISOString(),
            emailProviderAccepted:
              true,
            recipient,
            notificationId:
              prepared.notification.id,
            publicOfferLinkId:
              prepared.link.id,
            providerMessageId,
          },
          metadata: {
            source:
              "automatic_quote_email",
            quoteId:
              currentQuote.id,
            automatic: true,
            rawTokenStored: false,
            fullPublicUrlStored:
              false,
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        alreadySent: false,
        emailProviderAccepted:
          true,
        message:
          "Der E-Mail-Provider hat den Versand der Offerte angenommen.",
        quoteId:
          currentQuote.id,
        quoteNumber:
          currentQuote.quoteNumber,
        quoteStatus:
          QuoteStatus.SENT,
        recipient,
        notificationId:
          prepared.notification.id,
        publicOfferLinkId:
          prepared.link.id,
        providerMessageId,
        sentAt:
          sentAt.toISOString(),
      },
      {
        status: 201,
        headers:
          responseHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "Automatic quote email error:",
      error,
    );

    return jsonError(
      "Die Offerte konnte nicht automatisch versendet werden.",
      500,
      {
        error:
          errorMessage(error),
      },
    );
  }
}
