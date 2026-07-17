import {
  CustomerType,
  EstimateStatus,
  PrismaClient,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type CreateEstimateItemBody = {
  serviceCatalogItemId?: string;
  itemName?: string;
  itemDescription?: string;
  itemCategory?: string;
  itemUnit?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  riskMultiplier?: string | number;
};

type CreateEstimateBody = {
  mode?: string;
  customerType?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  customerNotes?: string;
  title?: string;
  description?: string;
  serviceStreet?: string;
  serviceZipCode?: string;
  serviceCity?: string;
  serviceCountry?: string;
  travelFee?: string | number;
  materialFee?: string | number;
  discountAmount?: string | number;
  notesCustomer?: string;
  notesInternal?: string;
  items?: CreateEstimateItemBody[];
};

type ReadBodyResult = {
  body: CreateEstimateBody | null;
  invalidJson: boolean;
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

function money(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    return Number(normalized);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return Number(value.toString());
  }

  return 0;
}

function nonNegativeNumber(value: unknown, fallback = 0) {
  const number = decimalToNumber(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
}

function positiveNumber(value: unknown, fallback = 1) {
  const number = decimalToNumber(value);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  return number;
}

function positiveMultiplier(value: unknown, fallback = 1) {
  const number = decimalToNumber(value);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  return number;
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

function normalizeEmail(value: unknown) {
  const text = cleanText(value, 240);

  if (!text) {
    return null;
  }

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return match ? match[0].toLowerCase() : null;
}

function normalizePhone(value: unknown) {
  const text = cleanText(value, 80);

  if (!text) {
    return null;
  }

  const phoneCandidate = text
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+")
    .slice(0, 30);

  const digitCount = phoneCandidate.replace(/\D/g, "").length;

  if (digitCount < 6) {
    return null;
  }

  return phoneCandidate;
}

function createEstimateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `EST-${date}-${random}`;
}

async function readBody(request: Request): Promise<ReadBodyResult> {
  const text = await request.text();

  if (!text.trim()) {
    return {
      body: null,
      invalidJson: false,
    };
  }

  try {
    return {
      body: JSON.parse(text) as CreateEstimateBody,
      invalidJson: false,
    };
  } catch {
    return {
      body: null,
      invalidJson: true,
    };
  }
}

function isValidCategory(value: unknown): value is ServiceCatalogCategory {
  return (
    typeof value === "string" &&
    Object.values(ServiceCatalogCategory).includes(
      value as ServiceCatalogCategory,
    )
  );
}

function isValidUnit(value: unknown): value is ServiceCatalogUnit {
  return (
    typeof value === "string" &&
    Object.values(ServiceCatalogUnit).includes(value as ServiceCatalogUnit)
  );
}

function normalizeCategory(value: unknown) {
  const text = cleanText(value, 80)?.toUpperCase();

  if (isValidCategory(text)) {
    return text;
  }

  return ServiceCatalogCategory.OTHER;
}

function normalizeUnit(value: unknown) {
  const text = cleanText(value, 80)?.toUpperCase();

  if (isValidUnit(text)) {
    return text;
  }

  return ServiceCatalogUnit.CUSTOM;
}

function getCustomerType(value: unknown) {
  const text = cleanText(value, 80)?.toUpperCase();

  if (text === CustomerType.COMPANY) {
    return CustomerType.COMPANY;
  }

  return CustomerType.PRIVATE;
}

function isManualEstimateBody(
  body: CreateEstimateBody | null,
): body is CreateEstimateBody {
  if (!body) return false;

  return (
    body.mode === "manual" ||
    Boolean(
      body.firstName ||
        body.lastName ||
        body.companyName ||
        body.email ||
        body.phone ||
        body.title ||
        body.serviceCity ||
        body.items?.length,
    )
  );
}

function validateManualEstimateBody(body: CreateEstimateBody) {
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const firstName = cleanText(body.firstName, 120);
  const lastName = cleanText(body.lastName, 120);
  const companyName = cleanText(body.companyName, 160);
  const items = Array.isArray(body.items) ? body.items : [];

  const hasCustomerIdentity = Boolean(
    email || phone || firstName || lastName || companyName,
  );

  if (!hasCustomerIdentity) {
    return {
      valid: false,
      message:
        "Bitte mindestens Name, Firma, E-Mail oder Telefon fuer den Kunden angeben.",
    };
  }

  if (items.length === 0) {
    return {
      valid: false,
      message: "Bitte mindestens eine Kalkulationsposition angeben.",
    };
  }

  return {
    valid: true,
    message: null,
  };
}

async function getOrCreateManualCustomer(
  prisma: PrismaClient,
  body: CreateEstimateBody,
) {
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);

  if (email) {
    const existingByEmail = await prisma.customer.findFirst({
      where: {
        email,
      },
    });

    if (existingByEmail) return existingByEmail;
  }

  if (phone) {
    const existingByPhone = await prisma.customer.findFirst({
      where: {
        phone,
      },
    });

    if (existingByPhone) return existingByPhone;
  }

  return prisma.customer.create({
    data: {
      type: getCustomerType(body.customerType),
      firstName: cleanText(body.firstName, 120),
      lastName: cleanText(body.lastName, 120),
      companyName: cleanText(body.companyName, 160),
      email,
      phone,
      street: cleanText(body.serviceStreet, 200),
      zipCode: cleanText(body.serviceZipCode, 40),
      city: cleanText(body.serviceCity, 120),
      country: cleanText(body.serviceCountry, 20) ?? "CH",
      notes: cleanText(body.customerNotes, 2000),
    },
  });
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const estimates = await prisma.estimate.findMany({
      where: {
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
        order: true,
        session: true,
        items: {
          include: {
            serviceCatalogItem: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        attachments: true,
        notifications: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      layer: "estimates-api",
      message: "Estimates loaded",
      data: {
        status: "success",
        message: "Kalkulationen geladen.",
        estimates,
      },
    });
  } catch (error) {
    console.error("Estimates API error:", error);

    return NextResponse.json(
      {
        layer: "estimates-api",
        message: "Estimates API error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown estimates API error",
          estimates: [],
        },
      },
      {
        status: 500,
      },
    );
  }
}

async function createManualEstimate(
  prisma: PrismaClient,
  body: CreateEstimateBody,
) {
  const validation = validateManualEstimateBody(body);

  if (!validation.valid) {
    return NextResponse.json(
      {
        layer: "estimates-api",
        message: "Manual estimate validation failed",
        data: {
          status: "error",
          message: validation.message,
          estimate: null,
        },
      },
      {
        status: 400,
      },
    );
  }

  const customer = await getOrCreateManualCustomer(prisma, body);
  const manualItems = Array.isArray(body.items) ? body.items : [];

  const serviceIds = manualItems
    .map((item) => cleanText(item.serviceCatalogItemId, 80))
    .filter(Boolean) as string[];

  const catalogItems =
    serviceIds.length > 0
      ? await prisma.serviceCatalogItem.findMany({
          where: {
            tenantKey: TENANT_KEY,
            id: {
              in: serviceIds,
            },
          },
        })
      : [];

  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));

  const estimateItems = manualItems.map((item, index) => {
    const catalogItemId = cleanText(item.serviceCatalogItemId, 80);
    const catalogItem = catalogItemId ? catalogById.get(catalogItemId) : null;

    const quantity = positiveNumber(
      item.quantity,
      decimalToNumber(catalogItem?.defaultQuantity) || 1,
    );

    const unitPrice = nonNegativeNumber(
      item.unitPrice,
      decimalToNumber(catalogItem?.basePrice) || 0,
    );

    const riskMultiplier = positiveMultiplier(
      item.riskMultiplier,
      decimalToNumber(catalogItem?.riskMultiplier) || 1,
    );

    const minPrice = nonNegativeNumber(catalogItem?.minPrice, 0);
    const subtotal = quantity * unitPrice;
    const itemTotalBeforeMin = subtotal * riskMultiplier;
    const itemTotal = Math.max(itemTotalBeforeMin, minPrice);
    const itemRiskAmount = Math.max(itemTotal - subtotal, 0);

    const category = catalogItem?.category ?? normalizeCategory(item.itemCategory);
    const unit = catalogItem?.unit ?? normalizeUnit(item.itemUnit);

    return {
      serviceCatalogItemId: catalogItem?.id ?? null,
      name:
        cleanText(item.itemName, 200) ??
        catalogItem?.name ??
        `Position ${index + 1}`,
      description:
        cleanText(item.itemDescription, 1000) ??
        catalogItem?.description ??
        null,
      category,
      unit,
      quantity: money(quantity),
      unitPrice: money(unitPrice),
      subtotal: money(subtotal),
      riskMultiplier: money(riskMultiplier),
      riskAmount: money(itemRiskAmount),
      discountAmount: "0.00",
      total: money(itemTotal),
      sortOrder: (index + 1) * 10,
      metadata: {
        source: catalogItem ? "service-catalog-estimate" : "manual-estimate-api",
        serviceSlug: catalogItem?.slug ?? null,
        manualCategory: cleanText(item.itemCategory, 80),
        manualUnit: cleanText(item.itemUnit, 80),
      },
    };
  });

  const subtotal = estimateItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0,
  );

  const riskAmount = estimateItems.reduce(
    (sum, item) => sum + Number(item.riskAmount),
    0,
  );

  const travelFee = nonNegativeNumber(body.travelFee, 0);
  const materialFee = nonNegativeNumber(body.materialFee, 0);
  const discountAmount = nonNegativeNumber(body.discountAmount, 0);

  const totalBeforeDiscount = subtotal + riskAmount + travelFee + materialFee;
  const total = Math.max(totalBeforeDiscount - discountAmount, 0);

  const averageRiskMultiplier =
    subtotal > 0 ? (subtotal + riskAmount) / subtotal : 1;

  const title =
    cleanText(body.title, 200) ??
    `Kalkulation: ${estimateItems[0]?.name ?? "HEXA CLEAN Leistung"}`;

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: createEstimateNumber(),
      tenantKey: TENANT_KEY,
      customerId: customer.id,
      status: EstimateStatus.DRAFT,
      source: "ADMIN",
      title,
      description: cleanText(body.description, 3000),
      serviceStreet: cleanText(body.serviceStreet, 200),
      serviceZipCode: cleanText(body.serviceZipCode, 40),
      serviceCity: cleanText(body.serviceCity, 120),
      serviceCountry: cleanText(body.serviceCountry, 20) ?? "CH",
      subtotal: money(subtotal),
      riskMultiplier: money(averageRiskMultiplier),
      riskAmount: money(riskAmount),
      travelFee: money(travelFee),
      materialFee: money(materialFee),
      discountAmount: money(discountAmount),
      total: money(total),
      currency: "CHF",
      aiMinTotal: money(total * 0.9),
      aiMaxTotal: money(total * 1.15),
      aiNotes:
        "Automatische interne Plausibilitaetsspanne. Vor Versand an den Kunden ist die Pruefung durch den Inhaber erforderlich.",
      notesCustomer:
        cleanText(body.notesCustomer, 2000) ??
        "Die verbindliche Offerte erfolgt nach Pruefung des Umfangs.",
      notesInternal:
        cleanText(body.notesInternal, 3000) ??
        "Manuelle Kalkulation aus dem Dashboard. Kein Demo-Datensatz.",
      items: {
        create: estimateItems,
      },
    },
    include: {
      customer: true,
      order: true,
      session: true,
      items: {
        include: {
          serviceCatalogItem: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      notifications: true,
      auditLogs: true,
    },
  });

  return NextResponse.json({
    layer: "estimates-api",
    message: "Manual estimate created",
    data: {
      status: "success",
      message: "Manuelle Kalkulation wurde erstellt.",
      estimate,
    },
  });
}

export async function POST(request: Request) {
  try {
    const prisma = getPrisma();
    const { body, invalidJson } = await readBody(request);

    if (invalidJson) {
      return NextResponse.json(
        {
          layer: "estimates-api",
          message: "Invalid JSON body",
          data: {
            status: "error",
            message: "Ungueltiger JSON-Body.",
            estimate: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    if (!isManualEstimateBody(body)) {
      return NextResponse.json(
        {
          layer: "estimates-api",
          message: "Demo estimate creation disabled",
          data: {
            status: "error",
            message:
              "Demo-Erstellung ist deaktiviert. Kalkulationen entstehen nur aus QuickOffer, Chatbox oder einem echten manuellen Formular.",
            estimate: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    return createManualEstimate(prisma, body);
  } catch (error) {
    console.error("Estimate create error:", error);

    return NextResponse.json(
      {
        layer: "estimates-api",
        message: "Estimate create error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown estimate create error",
          estimate: null,
        },
      },
      {
        status: 500,
      },
    );
  }
}
