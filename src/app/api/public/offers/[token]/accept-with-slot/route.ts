import {
  AuditAction,
  AvailabilitySlotStatus,
  OrderStatus,
  PrismaClient,
  QuoteStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  NextRequest,
  NextResponse,
} from "next/server";

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
  sendOrderConfirmationWorkflow,
} from "@/lib/order-confirmation-email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 5 * 60 * 1000;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is missing",
      );
    }

    globalForPrisma.hexaPrisma =
      new PrismaClient({
        adapter: new PrismaPg({
          connectionString:
            databaseUrl,
        }),
      });
  }

  return globalForPrisma.hexaPrisma;
}

function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    {
      status,
      headers,
    },
  );
}

function validSlotId(value: unknown) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    )
  );
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  try {
    const { token } =
      await context.params;
    const rawToken =
      normalizePublicOfferToken(token);

    const rateLimit =
      checkPublicRateLimit(request, {
        scope:
          "public_offer_accept_with_slot",
        limit: RATE_LIMIT,
        windowMs: RATE_WINDOW_MS,
        token: rawToken ?? token,
      });

    if (!rateLimit.allowed) {
      return createPublicRateLimitResponse(
        rateLimit,
      );
    }

    if (!rawToken) {
      return createSafePublicNotFoundResponse();
    }

    const body =
      (await request.json()) as {
        confirmAcceptance?: unknown;
        availabilitySlotId?: unknown;
      };

    if (
      body.confirmAcceptance !== true
    ) {
      return jsonError(
        "Die verbindliche Bestätigung ist erforderlich.",
        400,
        rateLimit.headers,
      );
    }

    if (
      !validSlotId(
        body.availabilitySlotId,
      )
    ) {
      return jsonError(
        "Bitte waehlen Sie einen gueltigen freien Termin aus.",
        400,
        rateLimit.headers,
      );
    }

    const availabilitySlotId =
      String(
        body.availabilitySlotId,
      ).trim();

    const prisma = getPrisma();
    const now = new Date();
    const tokenHash =
      createPublicOfferTokenHash(
        rawToken,
      );

    const link =
      await prisma.publicOfferLink.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          acceptedAt: true,
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              status: true,
              acceptedAt: true,
              validUntil: true,
              customerId: true,
              orderId: true,
              sessionId: true,
            },
          },
        },
      });

    if (!link) {
      return createSafePublicNotFoundResponse();
    }

    if (
      link.revokedAt ||
      isPublicOfferLinkExpired(
        link.expiresAt,
        now,
      )
    ) {
      return createSafePublicGoneResponse(
        "Dieser Angebotslink ist nicht mehr aktiv.",
      );
    }

    if (
      link.quote.validUntil &&
      link.quote.validUntil.getTime() <=
        now.getTime()
    ) {
      return createSafePublicGoneResponse(
        "Die Gueltigkeit der Offerte ist abgelaufen.",
      );
    }

    if (
      link.quote.status !==
        QuoteStatus.SENT ||
      link.quote.acceptedAt ||
      link.acceptedAt
    ) {
      return jsonError(
        "Diese Offerte kann nicht mehr akzeptiert werden.",
        409,
        rateLimit.headers,
      );
    }

    if (!link.quote.orderId) {
      return jsonError(
        "Diese Offerte ist keinem Auftrag zugeordnet.",
        409,
        rateLimit.headers,
      );
    }

    const orderId = link.quote.orderId;

    const result =
      await prisma
        .$transaction(
          async (tx) => {
            const slot =
              await tx.availabilitySlot.findFirst({
                where: {
                  id: availabilitySlotId,
                  tenantKey: TENANT_KEY,
                  status:
                    AvailabilitySlotStatus.AVAILABLE,
                  orderId: null,
                  startAt: {
                    gt: now,
                  },
                },
                select: {
                  id: true,
                  startAt: true,
                  endAt: true,
                },
              });

            if (!slot) {
              throw new Error(
                "SLOT_NOT_AVAILABLE",
              );
            }

            const reservation =
              await tx.availabilitySlot.updateMany({
                where: {
                  id: slot.id,
                  tenantKey: TENANT_KEY,
                  status:
                    AvailabilitySlotStatus.AVAILABLE,
                  orderId: null,
                },
                data: {
                  status:
                    AvailabilitySlotStatus.BOOKED,
                  orderId,
                },
              });

            if (
              reservation.count !== 1
            ) {
              throw new Error(
                "SLOT_NOT_AVAILABLE",
              );
            }

            const order =
              await tx.order.update({
                where: {
                  id: orderId,
                },
                data: {
                  status:
                    OrderStatus.SCHEDULED,
                  scheduledStart:
                    slot.startAt,
                  scheduledEnd:
                    slot.endAt,
                },
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                },
              });

            const quote =
              await tx.quote.update({
                where: {
                  id: link.quote.id,
                },
                data: {
                  status:
                    QuoteStatus.ACCEPTED,
                  acceptedAt: now,
                },
                select: {
                  id: true,
                  quoteNumber: true,
                  status: true,
                  acceptedAt: true,
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
                customerId:
                  link.quote.customerId,
                orderId,
                sessionId:
                  link.quote.sessionId,
                action:
                  AuditAction.STATUS_CHANGE,
                entityType: "Quote",
                entityId: quote.id,
                actorType:
                  "customer_public_link",
                before: {
                  quoteStatus:
                    link.quote.status,
                },
                after: {
                  quoteStatus:
                    quote.status,
                  orderStatus:
                    order.status,
                  availabilitySlotId:
                    slot.id,
                  scheduledStart:
                    slot.startAt.toISOString(),
                  scheduledEnd:
                    slot.endAt.toISOString(),
                },
                message:
                  `Offerte ${quote.quoteNumber} und Termin wurden vom Kunden verbindlich bestaetigt.`,
                metadata: {
                  source:
                    "public_offer_accept_with_slot",
                  publicOfferLinkId:
                    link.id,
                  availabilitySlotId:
                    slot.id,
                  atomicBooking: true,
                },
              },
            });

            return {
              quote,
              order,
              slot,
            };
          },
        )
        .catch(
          (
            transactionError:
              unknown,
          ) => {
            if (
              transactionError instanceof
                Error &&
              transactionError.message ===
                "SLOT_NOT_AVAILABLE"
            ) {
              return null;
            }

            throw transactionError;
          },
        );

    if (!result) {
      return jsonError(
        "Dieser Termin ist nicht mehr verfuegbar. Bitte waehlen Sie einen anderen Termin.",
        409,
        rateLimit.headers,
      );
    }

    const automation =
      await sendOrderConfirmationWorkflow(
        result.quote.id,
      );

    logPublicSecurityEvent(request, {
      scope:
        "public_offer_accept_with_slot",
      reason:
        "offer_and_slot_accepted",
      severity: "info",
      token: rawToken,
      extra: {
        quoteId:
          result.quote.id,
        orderId:
          result.order.id,
        slotId:
          result.slot.id,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message:
          "Die Offerte und der Termin wurden erfolgreich bestaetigt.",
        offer: {
          quoteId:
            result.quote.id,
          quoteNumber:
            result.quote.quoteNumber,
          status:
            result.quote.status,
          acceptedAt:
            result.quote.acceptedAt?.toISOString() ??
            null,
        },
        appointment: {
          slotId:
            result.slot.id,
          startAt:
            result.slot.startAt.toISOString(),
          endAt:
            result.slot.endAt.toISOString(),
          orderId:
            result.order.id,
          orderNumber:
            result.order.orderNumber,
          orderStatus:
            result.order.status,
        },
        automation,
      },
      {
        headers:
          rateLimit.headers,
      },
    );
  } catch (error) {
    console.error(
      "Public offer accept with slot error:",
      error,
    );

    return jsonError(
      "Die Offerte und der Termin konnten nicht bestaetigt werden.",
      500,
    );
  }
}
