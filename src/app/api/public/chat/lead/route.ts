import {
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
import {
  checkPublicRateLimit,
  createPublicRateLimitResponse,
  logPublicAccessEvent,
  logPublicSecurityEvent,
} from "@/lib/public-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";
const CHAT_LEAD_RATE_LIMIT = 8;
const CHAT_LEAD_RATE_WINDOW_MS = 5 * 60 * 1000;

const OWNER_NOTIFICATION_EMAIL = emailConfiguration.ownerEmail;
const EMAIL_FROM = emailConfiguration.from;
const EMAIL_REPLY_TO = emailConfiguration.replyTo;

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type ChatSender = "user" | "assistant";

type ChatMessagePayload = {
  sender?: unknown;
  text?: unknown;
  time?: unknown;
};

type ChatAnswersPayload = {
  service?: unknown;
  serviceLabel?: unknown;
  objectType?: unknown;
  location?: unknown;
  area?: unknown;
  rooms?: unknown;
  bathrooms?: unknown;
  windows?: unknown;
  floor?: unknown;
  elevator?: unknown;
  parkingAccess?: unknown;
  condition?: unknown;
  frequency?: unknown;
  extras?: unknown;
  preferredDate?: unknown;
  flexibleDate?: unknown;
  photoRequired?: unknown;
  oven?: unknown;
  balcony?: unknown;
  description?: unknown;
  date?: unknown;
};

type ChatLeadPayload = {
  service?: unknown;
  objectType?: unknown;
  location?: unknown;
  areaM2?: unknown;
  rooms?: unknown;
  bathrooms?: unknown;
  windows?: unknown;
  floor?: unknown;
  elevator?: unknown;
  parkingAccess?: unknown;
  condition?: unknown;
  frequency?: unknown;
  extras?: unknown;
  preferredDate?: unknown;
  flexibleDate?: unknown;
  photoRequired?: unknown;
  customerName?: unknown;
  email?: unknown;
  phone?: unknown;
};

type ChatSessionPayload = {
  answers?: ChatAnswersPayload;
  progress?: unknown;
  estimatedPrice?: unknown;
  priceRange?: unknown;
  completed?: unknown;
};

type ChatLeadBody = {
  name?: unknown;
  contact?: unknown;
  lead?: ChatLeadPayload;
  session?: ChatSessionPayload;
  messages?: unknown;
  pageUrl?: unknown;
};

type NormalizedChatMessage = {
  sender: ChatSender;
  text: string;
  time: string | null;
};

type NormalizedChatLead = {
  name: string | null;
  contact: string;
  email: string | null;
  phone: string | null;
  pageUrl: string | null;
  service: string;
  serviceLabel: string;
  serviceType: ServiceType;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  quantity: number;
  estimatedPrice: number;
  priceRange: string;
  aiMinTotal: number;
  aiMaxTotal: number;
  answers: {
    service: string | null;
    serviceLabel: string | null;
    objectType: string | null;
    location: string | null;
    area: number | null;
    rooms: number | null;
    bathrooms: number | null;
    windows: number | null;
    floor: string | null;
    elevator: boolean | null;
    parkingAccess: string | null;
    condition: string | null;
    frequency: string | null;
    extras: string[];
    preferredDate: string | null;
    flexibleDate: boolean | null;
    photoRequired: boolean | null;
    oven: boolean | null;
    balcony: boolean | null;
    description: string | null;
    date: string | null;
  };
  messages: NormalizedChatMessage[];
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

function cleanMultilineText(value: unknown, maxLength = 3000) {
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

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function clampMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100000) {
    return 100000;
  }

  return Math.round(value);
}

function money(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
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

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function normalizePositiveInteger(value: unknown) {
  const parsed = cleanNumber(value, 0);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}


function normalizePositiveNumber(
  value: unknown,
) {
  const parsed =
    cleanNumber(value, 0);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return Math.round(
    (parsed + Number.EPSILON) *
      100,
  ) / 100;
}

function normalizeStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (item) =>
        cleanText(item, 120),
    )
    .filter(
      (item): item is string =>
        Boolean(item),
    )
    .slice(0, 20);
}

function parseServiceLocation(
  value: string | null,
) {
  if (!value) {
    return {
      street: null,
      zipCode: null,
      city: null,
      country: "CH",
    };
  }

  const normalized =
    value
      .replace(/\s+/g, " ")
      .trim();

  const fullAddress =
    normalized.match(
      /^(.*?\d+[A-Za-z]?)\s*,?\s*(\d{4,5})\s+(.+)$/,
    );

  if (fullAddress) {
    return {
      street:
        cleanText(
          fullAddress[1],
          240,
        ),
      zipCode:
        cleanText(
          fullAddress[2],
          40,
        ),
      city:
        cleanText(
          fullAddress[3],
          160,
        ),
      country: "CH",
    };
  }

  const zipCity =
    normalized.match(
      /^(\d{4,5})\s+(.+)$/,
    );

  if (zipCity) {
    return {
      street: null,
      zipCode:
        cleanText(
          zipCity[1],
          40,
        ),
      city:
        cleanText(
          zipCity[2],
          160,
        ),
      country: "CH",
    };
  }

  return {
    street:
      cleanText(
        normalized,
        240,
      ),
    zipCode: null,
    city: null,
    country: "CH",
  };
}

function buildChatDetailLines(
  lead: NormalizedChatLead,
) {
  return [
    `Leistung: ${lead.serviceLabel}`,
    `Objekt: ${
      lead.answers.objectType ?? "-"
    }`,
    `Einsatzort: ${
      lead.answers.location ?? "-"
    }`,
    `Fläche: ${
      lead.answers.area !== null
        ? `${lead.answers.area} m²`
        : "-"
    }`,
    `Zimmer: ${
      lead.answers.rooms ?? "-"
    }`,
    `Badezimmer: ${
      lead.answers.bathrooms ?? "-"
    }`,
    `Fenster: ${
      lead.answers.windows ?? "-"
    }`,
    `Etage: ${
      lead.answers.floor ?? "-"
    }`,
    `Lift: ${
      lead.answers.elevator === null
        ? "-"
        : lead.answers.elevator
          ? "Ja"
          : "Nein"
    }`,
    `Zugang/Parkplatz: ${
      lead.answers.parkingAccess ?? "-"
    }`,
    `Verschmutzung: ${
      lead.answers.condition ?? "-"
    }`,
    `Rhythmus: ${
      lead.answers.frequency ?? "-"
    }`,
    `Zusatzleistungen: ${
      lead.answers.extras.length > 0
        ? lead.answers.extras.join(", ")
        : "Keine"
    }`,
    `Wunschtermin: ${
      lead.answers.date ?? "-"
    }`,
    `Fotos erforderlich: ${
      lead.answers.photoRequired === null
        ? "-"
        : lead.answers.photoRequired
          ? "Ja"
          : "Nein"
    }`,
    `Beschreibung: ${
      lead.answers.description ?? "-"
    }`,
  ];
}

function parsePriceRange(priceRange: string | null, estimatedPrice: number) {
  const numbers =
    priceRange
      ?.match(/\d+([.,]\d+)?/g)
      ?.map((item) => Number(item.replace(",", ".")))
      .filter((item) => Number.isFinite(item)) ?? [];

  if (numbers.length >= 2) {
    return {
      min: clampMoney(numbers[0]),
      max: clampMoney(numbers[1]),
    };
  }

  if (estimatedPrice > 0) {
    return {
      min: clampMoney(Math.max(estimatedPrice - 40, 0)),
      max: clampMoney(estimatedPrice + 80),
    };
  }

  return {
    min: 0,
    max: 0,
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function normalizeChatMessages(value: unknown): NormalizedChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): NormalizedChatMessage | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const message = item as ChatMessagePayload;
      const sender = message.sender === "user" ? "user" : "assistant";
      const text = cleanMultilineText(message.text, 2000);
      const time = cleanText(message.time, 40);

      if (!text) {
        return null;
      }

      return {
        sender,
        text,
        time,
      };
    })
    .filter((item): item is NormalizedChatMessage => Boolean(item))
    .slice(-50);
}

function mapService(value: string | null, label: string | null) {
  const service = String(value ?? "").toLowerCase();

  if (service === "reinigung") {
    return {
      service: "reinigung",
      serviceLabel: label ?? "Reinigung",
      serviceType: ServiceType.REINIGUNG,
      category: ServiceCatalogCategory.REINIGUNG,
      unit: ServiceCatalogUnit.M2,
    };
  }

  if (service === "fenster") {
    return {
      service: "fenster",
      serviceLabel: label ?? "Fensterreinigung",
      serviceType: ServiceType.FENSTERREINIGUNG,
      category: ServiceCatalogCategory.FENSTERREINIGUNG,
      unit: ServiceCatalogUnit.WINDOW,
    };
  }

  if (service === "hauswartung") {
    return {
      service: "hauswartung",
      serviceLabel: label ?? "Hauswartung",
      serviceType: ServiceType.HAUSWARTUNG,
      category: ServiceCatalogCategory.HAUSWARTUNG,
      unit: ServiceCatalogUnit.FLAT,
    };
  }

  if (service === "umzug") {
    return {
      service: "umzug",
      serviceLabel: label ?? "Umzugsreinigung",
      serviceType: ServiceType.UMZUGSREINIGUNG,
      category: ServiceCatalogCategory.UMZUGSREINIGUNG,
      unit: ServiceCatalogUnit.M2,
    };
  }

  if (service === "kleinreparaturen") {
    return {
      service: "kleinreparaturen",
      serviceLabel: label ?? "Kleinreparaturen",
      serviceType: ServiceType.KLEINREPARATUREN,
      category: ServiceCatalogCategory.KLEINREPARATUREN,
      unit: ServiceCatalogUnit.FLAT,
    };
  }

  return {
    service: "other",
    serviceLabel: label ?? "Chatbot Anfrage",
    serviceType: ServiceType.OTHER,
    category: ServiceCatalogCategory.OTHER,
    unit: ServiceCatalogUnit.FLAT,
  };
}

function normalizeChatLeadBody(body: ChatLeadBody): {
  lead: NormalizedChatLead | null;
  error: string | null;
} {
  const explicitLead =
    body.lead ?? {};

  const rawContact =
    cleanText(
      body.contact,
      240,
    ) ??
    cleanText(
      explicitLead.email,
      320,
    ) ??
    cleanText(
      explicitLead.phone,
      100,
    );

  const name =
    cleanText(
      body.name,
      160,
    ) ??
    cleanText(
      explicitLead.customerName,
      160,
    );

  const pageUrl =
    cleanText(
      body.pageUrl,
      500,
    );

  if (!rawContact) {
    return {
      lead: null,
      error: "Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse ein.",
    };
  }

  const email =
    normalizeEmail(
      cleanText(
        explicitLead.email,
        320,
      ),
    ) ??
    normalizeEmail(rawContact);

  const phone =
    normalizePhone(
      cleanText(
        explicitLead.phone,
        100,
      ),
    ) ??
    normalizePhone(rawContact);

  if (!email && !phone) {
    return {
      lead: null,
      error: "Bitte geben Sie eine gültige Telefonnummer oder E-Mail-Adresse ein.",
    };
  }

  const answers =
    body.session?.answers ?? {};

  const rawService =
    cleanText(
      answers.service,
      80,
    );

  const rawServiceLabel =
    cleanText(
      explicitLead.service,
      120,
    ) ??
    cleanText(
      answers.serviceLabel,
      120,
    );

  const serviceData =
    mapService(
      rawService,
      rawServiceLabel,
    );

  const objectType =
    cleanText(
      explicitLead.objectType,
      120,
    ) ??
    cleanText(
      answers.objectType,
      120,
    );

  const location =
    cleanText(
      explicitLead.location,
      300,
    ) ??
    cleanText(
      answers.location,
      300,
    );

  const area =
    normalizePositiveNumber(
      explicitLead.areaM2,
    ) ??
    normalizePositiveNumber(
      answers.area,
    );

  const rooms =
    normalizePositiveNumber(
      explicitLead.rooms,
    ) ??
    normalizePositiveNumber(
      answers.rooms,
    );

  const bathrooms =
    normalizePositiveNumber(
      explicitLead.bathrooms,
    ) ??
    normalizePositiveNumber(
      answers.bathrooms,
    );

  const windows =
    normalizePositiveInteger(
      explicitLead.windows,
    ) ??
    normalizePositiveInteger(
      answers.windows,
    );

  const floor =
    cleanText(
      explicitLead.floor,
      120,
    ) ??
    cleanText(
      answers.floor,
      120,
    );

  const elevator =
    normalizeBoolean(
      explicitLead.elevator,
    ) ??
    normalizeBoolean(
      answers.elevator,
    );

  const parkingAccess =
    cleanText(
      explicitLead.parkingAccess,
      300,
    ) ??
    cleanText(
      answers.parkingAccess,
      300,
    );

  const condition =
    cleanText(
      explicitLead.condition,
      100,
    ) ??
    cleanText(
      answers.condition,
      100,
    );

  const frequency =
    cleanText(
      explicitLead.frequency,
      300,
    ) ??
    cleanText(
      answers.frequency,
      300,
    );

  const extrasFromLead =
    normalizeStringArray(
      explicitLead.extras,
    );

  const extras =
    extrasFromLead.length > 0
      ? extrasFromLead
      : normalizeStringArray(
          answers.extras,
        );

  const preferredDate =
    cleanText(
      explicitLead.preferredDate,
      200,
    ) ??
    cleanText(
      answers.preferredDate,
      200,
    );

  const flexibleDate =
    normalizeBoolean(
      explicitLead.flexibleDate,
    ) ??
    normalizeBoolean(
      answers.flexibleDate,
    );

  const photoRequired =
    normalizeBoolean(
      explicitLead.photoRequired,
    ) ??
    normalizeBoolean(
      answers.photoRequired,
    );

  const description =
    cleanMultilineText(
      answers.description,
      2000,
    );

  const date =
    preferredDate ??
    cleanText(
      answers.date,
      200,
    ) ??
    (
      flexibleDate === true
        ? "Flexibel"
        : null
    );

  const estimatedPrice = clampMoney(cleanNumber(body.session?.estimatedPrice, 0));
  const priceRange = cleanText(body.session?.priceRange, 120) ?? "Wird geprüft";
  const range = parsePriceRange(priceRange, estimatedPrice);

  const quantity =
    serviceData.unit === ServiceCatalogUnit.M2
      ? area ?? 1
      : serviceData.unit === ServiceCatalogUnit.WINDOW
        ? windows ?? 1
        : 1;

  const messages = normalizeChatMessages(body.messages);

  if (messages.length === 0) {
    return {
      lead: null,
      error: "Die Chat-Nachrichten fehlen.",
    };
  }

  return {
    lead: {
      name,
      contact: rawContact,
      email,
      phone,
      pageUrl,
      service: serviceData.service,
      serviceLabel: serviceData.serviceLabel,
      serviceType: serviceData.serviceType,
      category: serviceData.category,
      unit: serviceData.unit,
      quantity,
      estimatedPrice,
      priceRange,
      aiMinTotal: range.min,
      aiMaxTotal: range.max,
      answers: {
        service:
          rawService,
        serviceLabel:
          rawServiceLabel,
        objectType,
        location,
        area,
        rooms,
        bathrooms,
        windows,
        floor,
        elevator,
        parkingAccess,
        condition,
        frequency,
        extras,
        preferredDate,
        flexibleDate,
        photoRequired,
        oven:
          normalizeBoolean(
            answers.oven,
          ) ??
          extras.some(
            (extra) =>
              extra
                .toLocaleLowerCase(
                  "de-CH",
                )
                .includes(
                  "backofen",
                ),
          ),
        balcony:
          normalizeBoolean(
            answers.balcony,
          ) ??
          extras.some(
            (extra) =>
              extra
                .toLocaleLowerCase(
                  "de-CH",
                )
                .includes(
                  "balkon",
                ),
          ),
        description,
        date,
      },
      messages,
    },
    error: null,
  };
}

function buildPlainMessage(
  lead: NormalizedChatLead,
) {
  return [
    "Neue KI-Chatbox Anfrage von der Website.",
    "",
    `Name: ${lead.name ?? "-"}`,
    `Kontakt: ${lead.contact}`,
    `E-Mail: ${lead.email ?? "-"}`,
    `Telefon: ${lead.phone ?? "-"}`,
    "",
    ...buildChatDetailLines(lead),
    "",
    `Geschätzter Preis: ${lead.priceRange}`,
    `Seite: ${lead.pageUrl ?? "-"}`,
    "",
    "Chatverlauf:",
    ...lead.messages.map(
      (message) => {
        const role =
          message.sender === "user"
            ? "Kunde"
            : "Assistent";

        const time =
          message.time
            ? ` (${message.time})`
            : "";

        return `${role}${time}: ${message.text}`;
      },
    ),
  ].join("\n");
}

function buildOwnerEmailHtml(
  lead: NormalizedChatLead,
  crm: {
    customerId: string;
    sessionId: string;
    orderId: string;
    orderNumber: string;
    estimateId: string;
    estimateNumber: string;
  },
) {
  const details =
    buildChatDetailLines(lead)
      .map(
        (line) =>
          `<li>${escapeHtml(line)}</li>`,
      )
      .join("");

  const chatHtml =
    lead.messages
      .map(
        (message) => {
          const role =
            message.sender === "user"
              ? "Kunde"
              : "Assistent";

          const time =
            message.time
              ? ` (${escapeHtml(
                  message.time,
                )})`
              : "";

          return `<p><strong>${role}${time}:</strong><br />${escapeHtml(
            message.text,
          ).replaceAll("\n",
            "<br />",
          )}</p>`;
        },
      )
      .join("");

  return `
    <h2>Neue KI-Chatbox Anfrage von HEXA CLEAN</h2>

    <h3>Kunde</h3>
    <p><strong>Name:</strong> ${escapeHtml(lead.name || "-")}</p>
    <p><strong>Kontakt:</strong> ${escapeHtml(lead.contact)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(lead.email || "-")}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(lead.phone || "-")}</p>

    <h3>Vollständiger Auftragsumfang</h3>
    <ul>${details}</ul>

    <p><strong>Geschätzter Preis:</strong> ${escapeHtml(lead.priceRange)}</p>
    <p><strong>Seite:</strong> ${escapeHtml(lead.pageUrl ?? "-")}</p>

    <hr />

    <h3>Chatverlauf</h3>
    ${chatHtml}

    <hr />

    <h3>CRM</h3>
    <p><strong>Order:</strong> ${escapeHtml(crm.orderNumber)}</p>
    <p><strong>Estimate:</strong> ${escapeHtml(crm.estimateNumber)}</p>
  `;
}

async function findOrCreateChatCustomer(
  prisma: PrismaClient | Prisma.TransactionClient,
  lead: NormalizedChatLead,
) {
  if (lead.email) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: lead.email,
      },
    });

    if (existingCustomer) {
      const nameParts =
        splitName(lead.name);

      const address =
        parseServiceLocation(
          lead.answers.location,
        );

      return prisma.customer.update({
        where: {
          id:
            existingCustomer.id,
        },
        data: {
          firstName:
            nameParts.firstName ??
            existingCustomer.firstName,
          lastName:
            nameParts.lastName ??
            existingCustomer.lastName,
          phone:
            lead.phone ??
            existingCustomer.phone,
          street:
            address.street ??
            existingCustomer.street,
          zipCode:
            address.zipCode ??
            existingCustomer.zipCode,
          city:
            address.city ??
            existingCustomer.city,
          country:
            address.country,
        },
      });
    }
  }

  const nameParts =
    splitName(lead.name);

  const address =
    parseServiceLocation(
      lead.answers.location,
    );

  return prisma.customer.create({
    data: {
      type: CustomerType.PRIVATE,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email:
        lead.email,
      phone:
        lead.phone,
      street:
        address.street,
      zipCode:
        address.zipCode,
      city:
        address.city,
      country:
        address.country,
      notes: [
        "Created from public KI-Chatbox.",
        `Original contact field: ${lead.contact}`,
      ].join("\n"),
    },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestBytes = getRequestBytes(request);

  const rateLimit = checkPublicRateLimit(request, {
    scope: "ai_chat_lead",
    limit: CHAT_LEAD_RATE_LIMIT,
    windowMs: CHAT_LEAD_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    logPublicSecurityEvent(request, {
      scope: "ai_chat_lead",
      reason: "rate_limit_exceeded",
      severity: "warning",
      extra: {
        limit: rateLimit.limit,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });

    logPublicAccessEvent(request, {
      scope: "ai_chat_lead",
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
    const body = (await request.json().catch(() => null)) as ChatLeadBody | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      logPublicSecurityEvent(request, {
        scope: "ai_chat_lead",
        reason: "invalid_request_body",
        severity: "info",
      });

      logPublicAccessEvent(request, {
        scope: "ai_chat_lead",
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

    const { lead, error } = normalizeChatLeadBody(body);

    if (!lead) {
      logPublicSecurityEvent(request, {
        scope: "ai_chat_lead",
        reason: "validation_failed",
        severity: "info",
        extra: {
          validationError: error ?? "Invalid chat lead request.",
        },
      });

      logPublicAccessEvent(request, {
        scope: "ai_chat_lead",
        statusCode: 400,
        success: false,
        rateLimit,
        requestBytes,
        responseMs: Date.now() - startedAt,
        extra: {
          reason: "validation_failed",
          validationError: error ?? "Invalid chat lead request.",
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
    const plainMessage = buildPlainMessage(lead);

    const unitPrice =
      lead.quantity > 0
        ? lead.estimatedPrice /
          Math.max(
            lead.quantity,
            1,
          )
        : lead.estimatedPrice;

    const serviceAddress =
      parseServiceLocation(
        lead.answers.location,
      );

    const crmResult = await prisma.$transaction(async (tx) => {
      const customer = await findOrCreateChatCustomer(tx, lead);

      const session = await tx.session.create({
        data: {
          status: SessionStatus.COMPLETED,
          customerId: customer.id,
          source: "ai_chat",
          metadata: {
            source: "public_website",
            component: "AIChat",
            pageUrl: lead.pageUrl,
            service: lead.service,
            serviceLabel: lead.serviceLabel,
            answers: lead.answers,
            estimatedPrice: lead.estimatedPrice,
            priceRange: lead.priceRange,
            aiMinTotal: lead.aiMinTotal,
            aiMaxTotal: lead.aiMaxTotal,
          },
        },
      });

      await tx.conversationMessage.createMany({
        data: lead.messages.map((message) => ({
          sessionId: session.id,
          customerId: customer.id,
          role:
            message.sender === "user"
              ? MessageRole.USER
              : MessageRole.ASSISTANT,
          content: message.text,
          metadata: {
            source: "ai_chat",
            time: message.time,
          },
        })),
      });

      const order = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          customerId: customer.id,
          sessionId: session.id,
          serviceType: lead.serviceType,
          title: `KI-Chatbox: ${lead.serviceLabel}`,
          description: plainMessage,
          status: OrderStatus.NEW,
          estimatedPrice: money(lead.estimatedPrice),
          currency: "CHF",
          notesCustomer:
            "Danke für Ihre Anfrage. Die finale Offerte erfolgt nach Prüfung der Angaben.",
          notesInternal:
            "Automatisch aus der öffentlichen KI-Chatbox erstellt. Vor Kontaktaufnahme prüfen.",
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
          source: "CHATBOT",
          title:
            `KI-Chatbox Anfrage: ${lead.serviceLabel}`,
          description:
            plainMessage,
          serviceStreet:
            serviceAddress.street,
          serviceZipCode:
            serviceAddress.zipCode,
          serviceCity:
            serviceAddress.city,
          serviceCountry:
            serviceAddress.country,
          subtotal: money(lead.estimatedPrice),
          riskMultiplier: "1.00",
          riskAmount: "0.00",
          travelFee: "0.00",
          materialFee: "0.00",
          discountAmount: "0.00",
          total: money(lead.estimatedPrice),
          currency: "CHF",
          aiMinTotal: money(lead.aiMinTotal),
          aiMaxTotal: money(lead.aiMaxTotal),
          aiNotes:
            "Automatisch aus KI-Chatbox berechnete Orientierungsspanne. Vor Versand an den Kunden manuell prüfen.",
          notesCustomer:
            "Dies ist eine orientierende Anfrage. Die verbindliche Offerte erfolgt nach Prüfung durch HEXA CLEAN.",
          notesInternal:
            "Public KI-Chatbox lead. Prüfen, ggf. Fotos/Details anfordern, dann Angebot freigeben.",
          items: {
            create: [
              {
                name:
                  lead.serviceLabel,
                description:
                  buildChatDetailLines(
                    lead,
                  ).join(" | "),
                category:
                  lead.category,
                unit:
                  lead.unit,
                quantity:
                  money(
                    lead.quantity,
                  ),
                unitPrice:
                  money(unitPrice),
                subtotal:
                  money(
                    lead.estimatedPrice,
                  ),
                riskMultiplier:
                  "1.00",
                riskAmount:
                  "0.00",
                discountAmount:
                  "0.00",
                total:
                  money(
                    lead.estimatedPrice,
                  ),
                sortOrder:
                  10,
                metadata: {
                  source:
                    "ai_chat",
                  lineType:
                    "BASE_SERVICE",
                  answers:
                    lead.answers,
                  priceRange:
                    lead.priceRange,
                },
              },
              ...lead.answers.extras.map(
                (extra, index) => ({
                  name:
                    `Zusatzleistung: ${extra}`,
                  description:
                    "Vom Kunden im Chat genannt. Preis und Umfang vor der verbindlichen Offerte prüfen.",
                  category:
                    lead.category,
                  unit:
                    ServiceCatalogUnit.FLAT,
                  quantity:
                    "1.00",
                  unitPrice:
                    "0.00",
                  subtotal:
                    "0.00",
                  riskMultiplier:
                    "1.00",
                  riskAmount:
                    "0.00",
                  discountAmount:
                    "0.00",
                  total:
                    "0.00",
                  sortOrder:
                    20 + index,
                  metadata: {
                    source:
                      "ai_chat",
                    lineType:
                      "SELECTED_EXTRA",
                    selectedByCustomer:
                      true,
                    includedInOrientation:
                      true,
                    actionRequired:
                      true,
                  },
                }),
              ),
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
          subject: "Neue KI-Chatbox Anfrage von HEXA CLEAN",
          message: plainMessage,
          metadata: {
            source: "ai_chat",
            customerId: customer.id,
            orderId: order.id,
            estimateId: estimate.id,
            sessionId: session.id,
            customerContact: lead.contact,
            customerEmail: lead.email,
            customerPhone: lead.phone,
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
            actorType: "public_ai_chat",
            message: "KI-Chatbox session created from public website.",
            metadata: {
              source: "ai_chat",
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
            actorType: "public_ai_chat",
            message: `Order ${order.orderNumber} created from KI-Chatbox.`,
            metadata: {
              source: "ai_chat",
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
            actorType: "public_ai_chat",
            message: `Estimate ${estimate.estimateNumber} created from KI-Chatbox.`,
            metadata: {
              source: "ai_chat",
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

    const emailHtml = buildOwnerEmailHtml(lead, {
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
        from: EMAIL_FROM,
        replyTo: EMAIL_REPLY_TO,
        to: [OWNER_NOTIFICATION_EMAIL],
        subject: "Neue KI-Chatbox Anfrage von HEXA CLEAN",
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
      scope: "ai_chat_lead",
      statusCode: 201,
      success: true,
      rateLimit,
      requestBytes,
      responseMs: Date.now() - startedAt,
      extra: {
        emailSent,
        hasEmail: Boolean(lead.email),
        hasPhone: Boolean(lead.phone),
        service: lead.service,
        serviceLabel: lead.serviceLabel,
        messagesCount: lead.messages.length,
        estimateNumber: crmResult.estimate.estimateNumber,
        orderNumber: crmResult.order.orderNumber,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "KI-Chatbox Anfrage wurde im CRM gespeichert.",
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
    console.error("AI Chat lead error:", error);

    logPublicSecurityEvent(request, {
      scope: "ai_chat_lead",
      reason: "server_error",
      severity: "critical",
      extra: {
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });

    logPublicAccessEvent(request, {
      scope: "ai_chat_lead",
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