import { Resend } from "resend";
import {
  AuditAction,
  CustomerType,
  EstimateStatus,
  MessageRole,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PrismaClient,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
  ServiceType,
  SessionStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest, NextResponse } from "next/server";

import {
  checkPublicRateLimit,
  createPublicRateLimitResponse,
  logPublicAccessEvent,
  logPublicSecurityEvent,
} from "@/lib/public-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";
const QUICK_OFFER_RATE_LIMIT = 10;
const QUICK_OFFER_RATE_WINDOW_MS = 5 * 60 * 1000;

const OWNER_NOTIFICATION_EMAIL =
  process.env.HEXA_OWNER_EMAIL || "meischel.meischelowy@gmail.com";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type QuickOfferBody = {
  name?: unknown;
  contact?: unknown;
  service?: unknown;
  size?: unknown;
  selectedExtras?: unknown;
  time?: unknown;
  price?: unknown;
};

type NormalizedQuickOffer = {
  name: string | null;
  contact: string;
  email: string | null;
  phone: string | null;
  service: string;
  serviceType: ServiceType;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  size: number;
  selectedExtras: string[];
  time: string;
  calculatedMinPrice: number;
  calculatedMaxPrice: number;
  clientPrice: string | null;
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

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function cleanMultilineText(value: unknown, maxLength = 4000) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function normalizeSize(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return 80;
  }

  if (parsed < 20) {
    return 20;
  }

  if (parsed > 1000) {
    return 1000;
  }

  return Math.round(parsed);
}

function normalizeExtras(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item, 80))
    .filter((item): item is string => Boolean(item))
    .slice(0, 20);
}

function normalizeEmail(value: string | null) {
  if (!value) {
    return null;
  }

  const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return emailMatch ? emailMatch[0].toLowerCase() : null;
}

function normalizePhone(value: string | null) {
  if (!value) {
    return null;
  }

  const phoneCandidate = value
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+")
    .slice(0, 30);

  const digitCount = phoneCandidate.replace(/\D/g, "").length;

  if (digitCount < 6) {
    return null;
  }

  return phoneCandidate;
}

function normalizeService(value: unknown) {
  const service = cleanText(value, 80) ?? "Wohnung";

  switch (service) {
    case "Haus":
      return {
        service,
        serviceType: ServiceType.REINIGUNG,
        category: ServiceCatalogCategory.REINIGUNG,
        unit: ServiceCatalogUnit.M2,
      };

    case "Büro":
      return {
        service,
        serviceType: ServiceType.REINIGUNG,
        category: ServiceCatalogCategory.REINIGUNG,
        unit: ServiceCatalogUnit.M2,
      };

    case "Fenster":
      return {
        service,
        serviceType: ServiceType.FENSTERREINIGUNG,
        category: ServiceCatalogCategory.FENSTERREINIGUNG,
        unit: ServiceCatalogUnit.FLAT,
      };

    case "Garten":
      return {
        service,
        serviceType: ServiceType.HAUSWARTUNG,
        category: ServiceCatalogCategory.HAUSWARTUNG,
        unit: ServiceCatalogUnit.FLAT,
      };

    case "Kleine Reparaturen":
      return {
        service,
        serviceType: ServiceType.KLEINREPARATUREN,
        category: ServiceCatalogCategory.KLEINREPARATUREN,
        unit: ServiceCatalogUnit.FLAT,
      };

    case "Wohnung":
    default:
      return {
        service: "Wohnung",
        serviceType: ServiceType.REINIGUNG,
        category: ServiceCatalogCategory.REINIGUNG,
        unit: ServiceCatalogUnit.M2,
      };
  }
}

function calculateQuickOfferPrice(
  service: string,
  size: number,
  selectedExtras: string[],
) {
  let base = 120;

  if (service === "Wohnung") base = size * 2.6;
  if (service === "Haus") base = size * 3.1;
  if (service === "Büro") base = size * 2.2;
  if (service === "Fenster") base = 140;
  if (service === "Garten") base = 180;
  if (service === "Kleine Reparaturen") base = 120;

  const extraPrice = selectedExtras.length * 35;
  const min = Math.round(base + extraPrice);
  const max = Math.round(min * 1.18);

  return {
    min,
    max,
  };
}

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `JOB-${date}-${random}`;
}

function createEstimateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `EST-${date}-${random}`;
}

function splitName(name: string | null) {
  if (!name) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: null,
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? null,
  };
}

function getRequestBytes(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));

  if (!Number.isInteger(contentLength) || contentLength < 0) {
    return null;
  }

  return contentLength;
}

function buildPlainMessage(offer: NormalizedQuickOffer) {
  return [
    "Neue QuickOffer Anfrage von der Website.",
    "",
    `Name: ${offer.name ?? "-"}`,
    `Kontakt: ${offer.contact}`,
    `E-Mail: ${offer.email ?? "-"}`,
    `Telefon: ${offer.phone ?? "-"}`,
    `Leistung: ${offer.service}`,
    `Grösse: ${offer.size} m²`,
    `Zusatzleistungen: ${
      offer.selectedExtras.length > 0 ? offer.selectedExtras.join(", ") : "Keine"
    }`,
    `Termin: ${offer.time}`,
    `Preisspanne Website: CHF ${offer.calculatedMinPrice}–${offer.calculatedMaxPrice}`,
    `Client price payload: ${offer.clientPrice ?? "-"}`,
  ].join("\n");
}

function buildOwnerEmailHtml(offer: NormalizedQuickOffer, crm: {
  customerId: string;
  sessionId: string;
  orderId: string;
  orderNumber: string;
  estimateId: string;
  estimateNumber: string;
}) {
  return `
    <h2>Neue QuickOffer Anfrage von HEXA CLEAN</h2>
    <p><strong>Name:</strong> ${escapeHtml(offer.name || "-")}</p>
    <p><strong>Kontakt:</strong> ${escapeHtml(offer.contact)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(offer.email || "-")}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(offer.phone || "-")}</p>
    <p><strong>Leistung:</strong> ${escapeHtml(offer.service)}</p>
    <p><strong>Grösse:</strong> ${escapeHtml(String(offer.size))} m²</p>
    <p><strong>Zusatzleistungen:</strong> ${
      offer.selectedExtras.length > 0
        ? escapeHtml(offer.selectedExtras.join(", "))
        : "Keine"
    }</p>
    <p><strong>Termin:</strong> ${escapeHtml(offer.time)}</p>
    <p><strong>Orientierende Preisspanne:</strong> CHF ${escapeHtml(
      String(offer.calculatedMinPrice),
    )}–${escapeHtml(String(offer.calculatedMaxPrice))}</p>

    <hr />

    <h3>CRM</h3>
    <p><strong>Customer ID:</strong> ${escapeHtml(crm.customerId)}</p>
    <p><strong>Session ID:</strong> ${escapeHtml(crm.sessionId)}</p>
    <p><strong>Order:</strong> ${escapeHtml(crm.orderNumber)} / ${escapeHtml(
      crm.orderId,
    )}</p>
    <p><strong>Estimate:</strong> ${escapeHtml(
      crm.estimateNumber,
    )} / ${escapeHtml(crm.estimateId)}</p>
  `;
}

function normalizeQuickOfferBody(body: QuickOfferBody): {
  offer: NormalizedQuickOffer | null;
  error: string | null;
} {
  const rawContact = cleanText(body.contact, 240);
  const name = cleanText(body.name, 160);
  const serviceData = normalizeService(body.service);
  const size = normalizeSize(body.size);
  const selectedExtras = normalizeExtras(body.selectedExtras);
  const time = cleanText(body.time, 80) ?? "Flexibel";
  const clientPrice = cleanText(body.price, 120);

  if (!rawContact) {
    return {
      offer: null,
      error: "Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse ein.",
    };
  }

  const email = normalizeEmail(rawContact);
  const phone = normalizePhone(rawContact);

  if (!email && !phone) {
    return {
      offer: null,
      error: "Bitte geben Sie eine gültige Telefonnummer oder E-Mail-Adresse ein.",
    };
  }

  const calculatedPrice = calculateQuickOfferPrice(
    serviceData.service,
    size,
    selectedExtras,
  );

  return {
    offer: {
      name,
      contact: rawContact,
      email,
      phone,
      service: serviceData.service,
      serviceType: serviceData.serviceType,
      category: serviceData.category,
      unit: serviceData.unit,
      size,
      selectedExtras,
      time,
      calculatedMinPrice: calculatedPrice.min,
      calculatedMaxPrice: calculatedPrice.max,
      clientPrice,
    },
    error: null,
  };
}

async function findOrCreateQuickOfferCustomer(
  prisma: PrismaClient,
  offer: NormalizedQuickOffer,
) {
  if (offer.email) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: offer.email,
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }
  }

  if (offer.phone) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone: offer.phone,
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }
  }

  const nameParts = splitName(offer.name);

  return prisma.customer.create({
    data: {
      type: CustomerType.PRIVATE,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: offer.email,
      phone: offer.phone,
      country: "CH",
      notes: [
        "Created from public QuickOffer form.",
        `Original contact field: ${offer.contact}`,
      ].join("\n"),
    },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestBytes = getRequestBytes(request);

  const rateLimit = checkPublicRateLimit(request, {
    scope: "quick_offer_contact",
    limit: QUICK_OFFER_RATE_LIMIT,
    windowMs: QUICK_OFFER_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    logPublicSecurityEvent(request, {
      scope: "quick_offer_contact",
      reason: "rate_limit_exceeded",
      severity: "warning",
      extra: {
        limit: rateLimit.limit,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });

    logPublicAccessEvent(request, {
      scope: "quick_offer_contact",
      statusCode: 429,
      success: false,
      rateLimit,
      requestBytes,
      responseMs: Date.now() - startedAt,
      extra: {
        reason: "rate_limit_exceeded",
      },
    });

    return createPublicRateLimitResponse(rateLimit);
  }

  try {
    const body = (await request.json().catch(() => null)) as QuickOfferBody | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      logPublicSecurityEvent(request, {
        scope: "quick_offer_contact",
        reason: "invalid_request_body",
        severity: "info",
      });

      logPublicAccessEvent(request, {
        scope: "quick_offer_contact",
        statusCode: 400,
        success: false,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
        extra: {
          reason: "invalid_request_body",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Die Anfrage konnte nicht verarbeitet werden.",
        },
        {
          status: 400,
          headers: {
            ...rateLimit.headers,
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const { offer, error } = normalizeQuickOfferBody(body);

    if (!offer) {
      logPublicSecurityEvent(request, {
        scope: "quick_offer_contact",
        reason: "validation_failed",
        severity: "info",
        extra: {
          validationError: error ?? "Invalid QuickOffer request.",
        },
      });

      logPublicAccessEvent(request, {
        scope: "quick_offer_contact",
        statusCode: 400,
        success: false,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
        extra: {
          reason: "validation_failed",
          validationError: error ?? "Invalid QuickOffer request.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: error ?? "Die Anfrage konnte nicht verarbeitet werden.",
        },
        {
          status: 400,
          headers: {
            ...rateLimit.headers,
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const prisma = getPrisma();
    const plainMessage = buildPlainMessage(offer);
    const unitPrice =
      offer.unit === ServiceCatalogUnit.M2
        ? offer.calculatedMinPrice / Math.max(offer.size, 1)
        : offer.calculatedMinPrice;

    const crmResult = await prisma.$transaction(async (tx) => {
      const customer = await findOrCreateQuickOfferCustomer(tx as PrismaClient, offer);

      const session = await tx.session.create({
        data: {
          status: SessionStatus.COMPLETED,
          customerId: customer.id,
          source: "quick_offer",
          metadata: {
            source: "public_website",
            component: "QuickOffer",
            service: offer.service,
            size: offer.size,
            selectedExtras: offer.selectedExtras,
            time: offer.time,
            calculatedMinPrice: offer.calculatedMinPrice,
            calculatedMaxPrice: offer.calculatedMaxPrice,
            clientPrice: offer.clientPrice,
          },
        },
      });

      const message = await tx.conversationMessage.create({
        data: {
          sessionId: session.id,
          customerId: customer.id,
          role: MessageRole.USER,
          content: plainMessage,
          metadata: {
            source: "quick_offer",
            contact: offer.contact,
            email: offer.email,
            phone: offer.phone,
          },
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          customerId: customer.id,
          sessionId: session.id,
          serviceType: offer.serviceType,
          title: `QuickOffer: ${offer.service}`,
          description: plainMessage,
          status: OrderStatus.NEW,
          estimatedPrice: money(offer.calculatedMinPrice),
          currency: "CHF",
          notesCustomer:
            "Danke für Ihre Anfrage. Die finale Offerte erfolgt nach Prüfung der Angaben.",
          notesInternal:
            "Automatisch aus dem öffentlichen QuickOffer Formular erstellt.",
        },
      });

      const estimate = await tx.estimate.create({
        data: {
          estimateNumber: createEstimateNumber(),
          tenantKey: TENANT_KEY,
          customerId: customer.id,
          orderId: order.id,
          sessionId: session.id,
          status: EstimateStatus.AI_REVIEW,
          source: "QUICK_OFFER",
          title: `QuickOffer Anfrage: ${offer.service}`,
          description: plainMessage,
          subtotal: money(offer.calculatedMinPrice),
          riskMultiplier: "1.00",
          riskAmount: "0.00",
          travelFee: "0.00",
          materialFee: "0.00",
          discountAmount: "0.00",
          total: money(offer.calculatedMinPrice),
          currency: "CHF",
          aiMinTotal: money(offer.calculatedMinPrice),
          aiMaxTotal: money(offer.calculatedMaxPrice),
          aiNotes:
            "Automatisch aus QuickOffer berechnete Orientierungsspanne. Vor Versand an den Kunden manuell prüfen.",
          notesCustomer:
            "Dies ist eine orientierende Anfrage. Die verbindliche Offerte erfolgt nach Prüfung durch HEXA CLEAN.",
          notesInternal:
            "Public QuickOffer lead. Prüfen, ggf. Fotos/Details anfordern, dann Angebot freigeben.",
          items: {
            create: [
              {
                name: `QuickOffer: ${offer.service}`,
                description:
                  offer.selectedExtras.length > 0
                    ? `Zusatzleistungen: ${offer.selectedExtras.join(", ")}`
                    : "Keine Zusatzleistungen ausgewählt.",
                category: offer.category,
                unit: offer.unit,
                quantity:
                  offer.unit === ServiceCatalogUnit.M2
                    ? money(offer.size)
                    : "1.00",
                unitPrice: money(unitPrice),
                subtotal: money(offer.calculatedMinPrice),
                riskMultiplier: "1.00",
                riskAmount: "0.00",
                discountAmount: "0.00",
                total: money(offer.calculatedMinPrice),
                sortOrder: 10,
                metadata: {
                  source: "quick_offer",
                  selectedExtras: offer.selectedExtras,
                  calculatedMaxPrice: offer.calculatedMaxPrice,
                },
              },
            ],
          },
        },
      });

      const notification = await tx.notification.create({
        data: {
          customerId: customer.id,
          orderId: order.id,
          estimateId: estimate.id,
          sessionId: session.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
          recipient: OWNER_NOTIFICATION_EMAIL,
          subject: "Neue QuickOffer Anfrage von HEXA CLEAN",
          message: plainMessage,
          metadata: {
            source: "quick_offer",
            customerId: customer.id,
            orderId: order.id,
            estimateId: estimate.id,
            sessionId: session.id,
            messageId: message.id,
            customerContact: offer.contact,
            customerEmail: offer.email,
            customerPhone: offer.phone,
          },
        },
      });

      await tx.auditLog.createMany({
        data: [
          {
            customerId: customer.id,
            sessionId: session.id,
            action: AuditAction.CREATE,
            entityType: "Session",
            entityId: session.id,
            actorType: "public_quick_offer",
            message: "QuickOffer session created from public website.",
            metadata: {
              source: "quick_offer",
            },
          },
          {
            customerId: customer.id,
            orderId: order.id,
            sessionId: session.id,
            estimateId: estimate.id,
            action: AuditAction.CREATE,
            entityType: "Order",
            entityId: order.id,
            actorType: "public_quick_offer",
            message: `Order ${order.orderNumber} created from QuickOffer.`,
            metadata: {
              source: "quick_offer",
            },
          },
          {
            customerId: customer.id,
            orderId: order.id,
            sessionId: session.id,
            estimateId: estimate.id,
            action: AuditAction.CREATE,
            entityType: "Estimate",
            entityId: estimate.id,
            actorType: "public_quick_offer",
            message: `Estimate ${estimate.estimateNumber} created from QuickOffer.`,
            metadata: {
              source: "quick_offer",
              status: EstimateStatus.AI_REVIEW,
            },
          },
        ],
      });

      return {
        customer,
        session,
        order,
        estimate,
        notification,
      };
    });

    const emailHtml = buildOwnerEmailHtml(offer, {
      customerId: crmResult.customer.id,
      sessionId: crmResult.session.id,
      orderId: crmResult.order.id,
      orderNumber: crmResult.order.orderNumber,
      estimateId: crmResult.estimate.id,
      estimateNumber: crmResult.estimate.estimateNumber,
    });

    let emailSent = false;
    let emailError: string | null = null;

    if (resend) {
      const { error: resendError } = await resend.emails.send({
        from: "HEXA CLEAN <onboarding@resend.dev>",
        to: [OWNER_NOTIFICATION_EMAIL],
        subject: "Neue QuickOffer Anfrage von HEXA CLEAN",
        html: emailHtml,
      });

      if (resendError) {
        emailError = JSON.stringify(resendError);
      } else {
        emailSent = true;
      }
    } else {
      emailError = "RESEND_API_KEY is missing";
    }

    await prisma.notification.update({
      where: {
        id: crmResult.notification.id,
      },
      data: {
        status: emailSent ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: emailSent ? new Date() : null,
        errorMessage: emailError,
      },
    });

    logPublicAccessEvent(request, {
      scope: "quick_offer_contact",
      statusCode: 201,
      success: true,
      rateLimit,
      requestBytes,
      responseMs: Date.now() - startedAt,
      extra: {
        emailSent,
        hasEmail: Boolean(offer.email),
        hasPhone: Boolean(offer.phone),
        service: offer.service,
        estimateNumber: crmResult.estimate.estimateNumber,
        orderNumber: crmResult.order.orderNumber,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "QuickOffer Anfrage wurde im CRM gespeichert.",
        emailSent,
        crm: {
          customerId: crmResult.customer.id,
          sessionId: crmResult.session.id,
          orderId: crmResult.order.id,
          orderNumber: crmResult.order.orderNumber,
          estimateId: crmResult.estimate.id,
          estimateNumber: crmResult.estimate.estimateNumber,
          notificationId: crmResult.notification.id,
        },
      },
      {
        status: 201,
        headers: {
          ...rateLimit.headers,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("QuickOffer contact error:", error);

    logPublicSecurityEvent(request, {
      scope: "quick_offer_contact",
      reason: "server_error",
      severity: "critical",
      extra: {
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });

    logPublicAccessEvent(request, {
      scope: "quick_offer_contact",
      statusCode: 500,
      success: false,
      rateLimit,
      requestBytes,
      responseMs: Date.now() - startedAt,
      extra: {
        reason: "server_error",
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Anfrage konnte aktuell nicht gespeichert werden. Bitte versuchen Sie es später erneut.",
      },
      {
        status: 500,
        headers: {
          ...rateLimit.headers,
          "Cache-Control": "no-store",
        },
      },
    );
  }
}