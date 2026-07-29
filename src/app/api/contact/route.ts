import {
  AttachmentType,
  AuditAction,
  CustomerType,
  EstimateStatus,
  MessageRole,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
  ServiceType,
  SessionStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest, NextResponse } from "next/server";

import { emailConfiguration, resend } from "@/lib/email-config";
import { calculateServerPrice } from "@/lib/pricing/server";
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
const QUICK_OFFER_MAX_PHOTOS = 5;
const QUICK_OFFER_MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const QUICK_OFFER_MAX_TOTAL_PHOTO_BYTES = 7 * 1024 * 1024;
const QUICK_OFFER_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const OWNER_NOTIFICATION_EMAIL = emailConfiguration.ownerEmail;
const EMAIL_FROM = emailConfiguration.from;
const EMAIL_REPLY_TO = emailConfiguration.replyTo;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type QuickOfferBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  street?: unknown;
  zipCode?: unknown;
  city?: unknown;
  country?: unknown;
  notes?: unknown;
  service?: unknown;
  size?: unknown;
  rooms?: unknown;
  bathrooms?: unknown;
  condition?: unknown;
  frequency?: unknown;
  selectedExtras?: unknown;
  time?: unknown;
  price?: unknown;
  calculatedMinPrice?: unknown;
  calculatedMaxPrice?: unknown;
  pricingConfidence?: unknown;
  requiresPhotoReview?: unknown;
};

type NormalizedQuickOffer = {
  name: string;
  contact: string;
  email: string;
  phone: string | null;
  street: string;
  zipCode: string;
  city: string;
  country: string;
  notes: string | null;
  service: string;
  serviceType: ServiceType;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  size: number;
  rooms: number;
  bathrooms: number;
  condition: string;
  frequency: string;
  selectedExtras: string[];
  time: string;
  photoCount: number;
  pricingConfidence: string;
  requiresPhotoReview: boolean;
  calculatedMinPrice: number;
  calculatedMaxPrice: number;
  clientPrice: string | null;
};

type NormalizedQuickOfferPhoto = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

type CrmResult = {
  customer: {
    id: string;
  };
  session: {
    id: string;
  };
  order: {
    id: string;
    orderNumber: string;
  };
  estimate: {
    id: string;
    estimateNumber: string;
  };
  ownerNotification: {
    id: string;
  };
  customerNotification: {
    id: string;
  } | null;
  attachments: Array<{
    id: string;
    fileName: string;
  }>;
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
  const service =
    cleanText(value, 80) ??
    "Grundreinigung";

  switch (service) {
    case "Unterhaltsreinigung":
      return {
        service,
        serviceType:
          ServiceType.REINIGUNG,
        category:
          ServiceCatalogCategory.REINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };

    case "Grundreinigung":
      return {
        service,
        serviceType:
          ServiceType.REINIGUNG,
        category:
          ServiceCatalogCategory.REINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };

    case "Umzugsreinigung":
      return {
        service,
        serviceType:
          ServiceType.UMZUGSREINIGUNG,
        category:
          ServiceCatalogCategory.UMZUGSREINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };

    case "Hausreinigung":
    case "Haus":
    case "Wohnung":
      return {
        service,
        serviceType:
          ServiceType.REINIGUNG,
        category:
          ServiceCatalogCategory.REINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };

    case "Buero":
    case "Buro":
    case "BĂĽro":
      return {
        service: "Buero",
        serviceType:
          ServiceType.REINIGUNG,
        category:
          ServiceCatalogCategory.REINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };

    case "Fenster":
      return {
        service,
        serviceType:
          ServiceType.FENSTERREINIGUNG,
        category:
          ServiceCatalogCategory.FENSTERREINIGUNG,
        unit:
          ServiceCatalogUnit.FLAT,
      };

    case "Garten":
      return {
        service,
        serviceType:
          ServiceType.HAUSWARTUNG,
        category:
          ServiceCatalogCategory.HAUSWARTUNG,
        unit:
          ServiceCatalogUnit.FLAT,
      };

    case "Kleine Reparaturen":
      return {
        service,
        serviceType:
          ServiceType.KLEINREPARATUREN,
        category:
          ServiceCatalogCategory.KLEINREPARATUREN,
        unit:
          ServiceCatalogUnit.FLAT,
      };

    default:
      return {
        service,
        serviceType:
          ServiceType.REINIGUNG,
        category:
          ServiceCatalogCategory.REINIGUNG,
        unit:
          ServiceCatalogUnit.M2,
      };
  }
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


function sanitizeFileName(value: string, index: number) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 120);

  return normalized || `quickoffer_foto_${index + 1}.jpg`;
}

async function normalizeQuickOfferPhotos(
  values: FormDataEntryValue[],
): Promise<NormalizedQuickOfferPhoto[]> {
  const files = values.filter(
    (value): value is File => value instanceof File && value.size > 0,
  );

  if (files.length > QUICK_OFFER_MAX_PHOTOS) {
    throw new Error(
      `Maximal ${QUICK_OFFER_MAX_PHOTOS} Fotos sind erlaubt.`,
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > QUICK_OFFER_MAX_TOTAL_PHOTO_BYTES) {
    throw new Error(
      "Die Fotos sind zusammen zu gross. Bitte waehlen Sie kleinere Dateien.",
    );
  }

  const normalized: NormalizedQuickOfferPhoto[] = [];

  for (const [index, file] of files.entries()) {
    if (
      !QUICK_OFFER_PHOTO_TYPES.has(file.type) ||
      file.size > QUICK_OFFER_MAX_PHOTO_BYTES
    ) {
      throw new Error(
        "Erlaubt sind JPG, PNG und WEBP bis 3 MB pro Foto.",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    normalized.push({
      fileName: sanitizeFileName(file.name, index),
      mimeType: file.type,
      sizeBytes: file.size,
      dataUrl,
    });
  }

  return normalized;
}

function getAppUrl(request: NextRequest) {
  return (
    process.env.HEXA_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin
  ).replace(/\/$/, "");
}


function conditionLabel(value: string) {
  switch (value) {
    case "LEICHT":
      return "Leicht";
    case "STARK":
      return "Stark";
    default:
      return "Normal";
  }
}

function frequencyLabel(value: string) {
  switch (value) {
    case "WOECHENTLICH":
      return "WĂ¶chentlich";
    case "ZWEIWOECHENTLICH":
      return "Alle zwei Wochen";
    case "MONATLICH":
      return "Monatlich";
    default:
      return "Einmalig";
  }
}

function buildOfferDetailLines(
  offer: NormalizedQuickOffer,
) {
  return [
    `Leistung: ${offer.service}`,
    `FlĂ¤che: ${offer.size} mÂ˛`,
    `Zimmer: ${offer.rooms}`,
    `Badezimmer: ${offer.bathrooms}`,
    `Verschmutzung: ${conditionLabel(
      offer.condition,
    )}`,
    `Rhythmus: ${frequencyLabel(
      offer.frequency,
    )}`,
    `GewĂĽnschter Zeitraum: ${offer.time}`,
    `Zusatzleistungen: ${
      offer.selectedExtras.length > 0
        ? offer.selectedExtras.join(", ")
        : "Keine"
    }`,
    `Fotos: ${offer.photoCount}`,
    `Bemerkungen: ${offer.notes ?? "-"}`,
  ];
}

function buildPlainMessage(
  offer: NormalizedQuickOffer,
) {
  return [
    "Neue QuickOffer Anfrage von der Website.",
    "",
    `Name: ${offer.name}`,
    `E-Mail: ${offer.email}`,
    `Telefon: ${offer.phone ?? "-"}`,
    `Adresse: ${offer.street}, ${offer.zipCode} ${offer.city}, ${offer.country}`,
    "",
    ...buildOfferDetailLines(offer),
    "",
    `Orientierende Preisspanne: CHF ${offer.calculatedMinPrice}-${offer.calculatedMaxPrice}`,
    "",
    "Status: Aktion erforderlich. Interne PrĂĽfung vor finaler Offerte.",
  ].join("\n");
}

function buildOwnerEmailHtml(
  offer: NormalizedQuickOffer,
  crm: {
    customerId: string;
    sessionId: string;
    orderId: string;
    orderNumber: string;
    estimateId: string;
    estimateNumber: string;
  },
  appUrl: string,
) {
  const estimateUrl =
    `${appUrl}/dashboard/estimates/${crm.estimateId}`;

  const customerUrl =
    `${appUrl}/dashboard/customers/${crm.customerId}`;

  const details =
    buildOfferDetailLines(offer)
      .map(
        (line) =>
          `<li>${escapeHtml(line)}</li>`,
      )
      .join("");

  return `
    <h2>Neue QuickOffer Anfrage - Aktion erforderlich</h2>

    <p><strong>Status:</strong> Interne PrĂĽfung erforderlich</p>

    <h3>Kunde und Einsatzort</h3>
    <p><strong>Name:</strong> ${escapeHtml(offer.name)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(offer.email)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(offer.phone || "-")}</p>
    <p><strong>Adresse:</strong> ${escapeHtml(
      `${offer.street}, ${offer.zipCode} ${offer.city}, ${offer.country}`,
    )}</p>

    <h3>VollstĂ¤ndiger Auftragsumfang</h3>
    <ul>${details}</ul>

    <p><strong>Orientierende Preisspanne:</strong>
      CHF ${escapeHtml(
        String(offer.calculatedMinPrice),
      )}-${escapeHtml(
        String(offer.calculatedMaxPrice),
      )}
    </p>

    <hr />

    <p>
      <a href="${escapeHtml(estimateUrl)}">
        Kalkulation im CRM Ă¶ffnen
      </a>
    </p>

    <p>
      <a href="${escapeHtml(customerUrl)}">
        Kundenprofil Ă¶ffnen
      </a>
    </p>

    <p><strong>Order:</strong> ${escapeHtml(crm.orderNumber)}</p>
    <p><strong>Estimate:</strong> ${escapeHtml(crm.estimateNumber)}</p>
  `;
}

function buildCustomerEmailHtml(
  offer: NormalizedQuickOffer,
) {
  const details =
    buildOfferDetailLines(offer)
      .map(
        (line) =>
          `<li>${escapeHtml(line)}</li>`,
      )
      .join("");

  return `
    <h2>Ihre Anfrage bei HEXA CLEAN ist eingegangen</h2>

    <p>Guten Tag ${escapeHtml(offer.name)}</p>

    <p>
      Wir haben Ihre Angaben und Fotos im CRM gespeichert.
      Bitte kontrollieren Sie die folgende Zusammenfassung.
    </p>

    <h3>Kontakt und Einsatzort</h3>
    <p><strong>E-Mail:</strong> ${escapeHtml(offer.email)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(offer.phone || "-")}</p>
    <p><strong>Adresse:</strong> ${escapeHtml(
      `${offer.street}, ${offer.zipCode} ${offer.city}, ${offer.country}`,
    )}</p>

    <h3>Auftragsumfang</h3>
    <ul>${details}</ul>

    <p><strong>Orientierende Preisspanne:</strong>
      CHF ${escapeHtml(
        String(offer.calculatedMinPrice),
      )}-${escapeHtml(
        String(offer.calculatedMaxPrice),
      )}
    </p>

    <hr />

    <p>
      <strong>Wichtig:</strong>
      Das ist noch keine verbindliche finale Offerte.
    </p>

    <p>
      HEXA CLEAN prĂĽft den Arbeitsumfang, die Fotos,
      die Anfahrt, das Material und die Positionen.
      Erst danach wird die verbindliche Offerte erstellt.
    </p>

    <p>Freundliche GrĂĽsse<br />HEXA CLEAN</p>
  `;
}

function buildCustomerEmailPlainText(
  offer: NormalizedQuickOffer,
) {
  return [
    "Ihre Anfrage bei HEXA CLEAN ist eingegangen.",
    "",
    `Name: ${offer.name}`,
    `E-Mail: ${offer.email}`,
    `Telefon: ${offer.phone ?? "-"}`,
    `Adresse: ${offer.street}, ${offer.zipCode} ${offer.city}, ${offer.country}`,
    "",
    ...buildOfferDetailLines(offer),
    "",
    `Orientierende Preisspanne: CHF ${offer.calculatedMinPrice}-${offer.calculatedMaxPrice}`,
    "",
    "Wichtig: Das ist noch keine verbindliche finale Offerte.",
    "HEXA CLEAN prĂĽft den Arbeitsumfang, die Fotos, die Anfahrt, das Material und die Positionen.",
    "",
    "Freundliche GrĂĽsse",
    "HEXA CLEAN",
  ].join("\n");
}

async function normalizeQuickOfferBody(

  body: QuickOfferBody,
  photoCount: number,
): Promise<{
  offer: NormalizedQuickOffer | null;
  error: string | null;
}> {
  const name =
    cleanText(
      body.name,
      160,
    );

  const email =
    normalizeEmail(
      cleanText(
        body.email,
        320,
      ),
    );

  const phone =
    normalizePhone(
      cleanText(
        body.phone,
        100,
      ),
    );

  const street =
    cleanText(
      body.street,
      240,
    );

  const zipCode =
    cleanText(
      body.zipCode,
      40,
    );

  const city =
    cleanText(
      body.city,
      160,
    );

  const country =
    cleanText(
      body.country,
      10,
    ) ?? "CH";

  const notes =
    cleanText(
      body.notes,
      2000,
    );

  const serviceData =
    normalizeService(body.service);

  const size =
    normalizeSize(body.size);

  const rooms = Math.min(
    Math.max(
      Number(body.rooms) || 3.5,
      1,
    ),
    12,
  );

  const bathrooms = Math.min(
    Math.max(
      Math.round(
        Number(body.bathrooms) || 1,
      ),
      1,
    ),
    8,
  );

  const condition =
    cleanText(
      body.condition,
      30,
    ) ?? "NORMAL";

  const frequency =
    cleanText(
      body.frequency,
      40,
    ) ?? "EINMALIG";

  const selectedExtras =
    normalizeExtras(
      body.selectedExtras,
    );

  const time =
    cleanText(
      body.time,
      80,
    ) ?? "Flexibel";

  const clientPrice =
    cleanText(
      body.price,
      120,
    );

  if (!name) {
    return {
      offer: null,
      error:
        "Bitte geben Sie Ihren Vor- und Nachnamen ein.",
    };
  }

  if (!email) {
    return {
      offer: null,
      error:
        "Bitte geben Sie eine gĂĽltige E-Mail-Adresse ein.",
    };
  }

  if (
    !street ||
    !zipCode ||
    !city
  ) {
    return {
      offer: null,
      error:
        "Bitte geben Sie die vollstĂ¤ndige Einsatzadresse ein.",
    };
  }

  const rawContact =
    phone
      ? `${email} / ${phone}`
      : email;

  const safePhotoCount = Math.min(
    Math.max(
      Math.round(
        Number(photoCount) || 0,
      ),
      0,
    ),
    QUICK_OFFER_MAX_PHOTOS,
  );

  const calculatedPrice =
    await calculateServerPrice({
      service:
        serviceData.service,
      areaM2: size,
      rooms,
      bathrooms,
      condition,
      frequency,
      extras:
        selectedExtras,
      photoCount:
        safePhotoCount,
    });

  return {
    offer: {
      name,
      contact: rawContact,
      email,
      phone,
      street,
      zipCode,
      city,
      country,
      notes,
      service:
        serviceData.service,
      serviceType:
        serviceData.serviceType,
      category:
        serviceData.category,
      unit:
        serviceData.unit,
      size,
      rooms,
      bathrooms,
      condition,
      frequency,
      selectedExtras,
      time,
      photoCount:
        safePhotoCount,
      pricingConfidence:
        calculatedPrice.confidence,
      requiresPhotoReview:
        calculatedPrice
          .requiresPhotoReview,
      calculatedMinPrice:
        calculatedPrice.min,
      calculatedMaxPrice:
        calculatedPrice.max,
      clientPrice,
    },
    error: null,
  };
}

async function findOrCreateQuickOfferCustomer(
  prisma: Prisma.TransactionClient,
  offer: NormalizedQuickOffer,
) {
  if (offer.email) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: offer.email,
      },
    });

    if (existingCustomer) {
      const nameParts =
        splitName(offer.name);

      return prisma.customer.update({
        where: {
          id: existingCustomer.id,
        },
        data: {
          firstName:
            nameParts.firstName,
          lastName:
            nameParts.lastName,
          phone:
            offer.phone ??
            existingCustomer.phone,
          street:
            offer.street,
          zipCode:
            offer.zipCode,
          city:
            offer.city,
          country:
            offer.country,
        },
      });
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
      street: offer.street,
      zipCode: offer.zipCode,
      city: offer.city,
      country: offer.country,
      notes: [
        "Created from public QuickOffer form.",
        `Original contact field: ${offer.contact}`,
      ].join("\n"),
    },
  });
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    return {
      sent: false,
      error: "RESEND_API_KEY is missing",
    };
  }

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    to: [to],
    subject,
    html,
    text,
  });

  if (error) {
    return {
      sent: false,
      error: JSON.stringify(error),
    };
  }

  return {
    sent: true,
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          error: "UngĂĽltiges Formularformat.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const payloadValue =
      formData.get("payload");

    if (typeof payloadValue !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Die Formulardaten fehlen.",
        },
        { status: 400 },
      );
    }

    let parsedPayload: unknown;

    try {
      parsedPayload =
        JSON.parse(payloadValue);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Die Formulardaten sind ungĂĽltig.",
        },
        { status: 400 },
      );
    }

    const body =
      parsedPayload as QuickOfferBody;

    const photos =
      await normalizeQuickOfferPhotos(
        formData.getAll("photos"),
      );

    const normalized =
      await normalizeQuickOfferBody(
        body,
        photos.length,
      );

    if (!normalized.offer) {
      return NextResponse.json(
        {
          success: false,
          error:
            normalized.error ??
            "Die Angaben sind unvollstĂ¤ndig.",
        },
        { status: 400 },
      );
    }

    const offer = normalized.offer;

    if (!resend) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der E-Mail-Versand ist momentan nicht konfiguriert.",
        },
        { status: 503 },
      );
    }

    const detailsHtml =
      buildOfferDetailLines(offer)
        .map(
          (line) =>
            `<li>${escapeHtml(line)}</li>`,
        )
        .join("");

    const ownerHtml = `
      <h2>Neue Anfrage ĂĽber Schnelle Offerte</h2>

      <h3>Kundendaten</h3>
      <p><strong>Name:</strong> ${escapeHtml(offer.name)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(offer.email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(offer.phone ?? "-")}</p>
      <p><strong>Adresse:</strong> ${escapeHtml(
        `${offer.street}, ${offer.zipCode} ${offer.city}, ${offer.country}`,
      )}</p>

      <h3>Anfrage</h3>
      <ul>${detailsHtml}</ul>

      <p>
        <strong>Unverbindliche Preisspanne:</strong>
        CHF ${escapeHtml(
          String(offer.calculatedMinPrice),
        )}â€“${escapeHtml(
          String(offer.calculatedMaxPrice),
        )}
      </p>

      <p>
        Diese Anfrage wurde nur per E-Mail ĂĽbermittelt.
        Es wurden keine automatischen Kunden-, Auftrags-
        oder Kalkulationsdaten im Dashboard erstellt.
      </p>
    `;

    const customerHtml = `
      <h2>Ihre Anfrage ist bei HEXA CLEAN eingegangen</h2>

      <p>Guten Tag ${escapeHtml(offer.name)}</p>

      <p>
        Vielen Dank fĂĽr Ihre Anfrage.
        Wir prĂĽfen Ihre Angaben und melden uns persĂ¶nlich bei Ihnen.
      </p>

      <h3>Ihre Angaben</h3>
      <ul>${detailsHtml}</ul>

      <p>
        <strong>Unverbindliche Preisspanne:</strong>
        CHF ${escapeHtml(
          String(offer.calculatedMinPrice),
        )}â€“${escapeHtml(
          String(offer.calculatedMaxPrice),
        )}
      </p>

      <p>
        Die angezeigte Preisspanne ist unverbindlich.
        Eine verbindliche Offerte erhalten Sie erst nach
        persĂ¶nlicher PrĂĽfung des Umfangs und der Fotos.
      </p>

      <p>Freundliche GrĂĽsse<br />HEXA CLEAN</p>
    `;

    const attachments =
      photos.map((photo) => ({
        filename: photo.fileName,
        content:
          photo.dataUrl.split(",")[1] ?? "",
      }));

    const ownerResult =
      await resend.emails.send({
        from: EMAIL_FROM,
        to: OWNER_NOTIFICATION_EMAIL,
        replyTo: offer.email,
        subject:
          `Neue Schnelle-Offerte-Anfrage: ${offer.service}`,
        html: ownerHtml,
        text: buildPlainMessage(offer),
        attachments,
      });

    if (ownerResult.error) {
      console.error(
        "Owner QuickOffer email error:",
        ownerResult.error,
      );

      return NextResponse.json(
        {
          success: false,
          ownerEmailSent: false,
          customerEmailSent: false,
          error:
            "Die Anfrage konnte nicht per E-Mail gesendet werden.",
        },
        { status: 502 },
      );
    }

    let customerEmailSent = false;
    let customerEmailError:
      string | null = null;

    try {
      const customerResult =
        await resend.emails.send({
          from: EMAIL_FROM,
          to: offer.email,
          replyTo: EMAIL_REPLY_TO,
          subject:
            "Ihre Anfrage bei HEXA CLEAN ist eingegangen",
          html: customerHtml,
          text:
            buildCustomerEmailPlainText(
              offer,
            ),
        });

      customerEmailSent =
        !customerResult.error;

      if (customerResult.error) {
        customerEmailError =
          String(
            customerResult.error.message ??
            "BestĂ¤tigung konnte nicht gesendet werden.",
          );
      }
    } catch (error) {
      customerEmailError =
        error instanceof Error
          ? error.message
          : "BestĂ¤tigung konnte nicht gesendet werden.";
    }

    return NextResponse.json({
      success: true,
      message:
        "Ihre Anfrage wurde per E-Mail an HEXA CLEAN gesendet.",
      emailSent: true,
      ownerEmailSent: true,
      customerEmailSent,
      customerEmailSkipped: false,
      customerEmailError,
      crm: null,
    });
  } catch (error) {
    console.error(
      "QuickOffer email-only error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        ownerEmailSent: false,
        customerEmailSent: false,
        error:
          error instanceof Error
            ? error.message
            : "Die Anfrage konnte nicht gesendet werden.",
      },
      { status: 500 },
    );
  }
}
