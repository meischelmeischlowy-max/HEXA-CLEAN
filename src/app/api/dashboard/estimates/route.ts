import { PrismaClient } from "@prisma/client";
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

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

function isManualEstimateBody(
  body: CreateEstimateBody | null
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
        body.items?.length
    )
  );
}

async function getOrCreateDemoCustomer(prisma: PrismaClient) {
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      email: "demo.estimate@hexa-clean.local",
    },
  });

  if (existingCustomer) {
    return existingCustomer;
  }

  return prisma.customer.create({
    data: {
      type: "PRIVATE",
      firstName: "Demo",
      lastName: "Kunde",
      email: "demo.estimate@hexa-clean.local",
      phone: "+41 79 000 00 00",
      street: "Musterstrasse 1",
      zipCode: "2502",
      city: "Biel/Bienne",
      country: "CH",
      notes: "Demo customer for estimate calculator testing.",
    },
  });
}

async function getOrCreateManualCustomer(
  prisma: PrismaClient,
  body: CreateEstimateBody
) {
  const email = cleanText(body.email);
  const phone = cleanText(body.phone);

  if (email) {
    const existingByEmail = await prisma.customer.findFirst({
      where: { email },
    });

    if (existingByEmail) return existingByEmail;
  }

  if (phone) {
    const existingByPhone = await prisma.customer.findFirst({
      where: { phone },
    });

    if (existingByPhone) return existingByPhone;
  }

  return prisma.customer.create({
    data: {
      type: "PRIVATE",
      firstName: cleanText(body.firstName),
      lastName: cleanText(body.lastName),
      companyName: cleanText(body.companyName),
      email,
      phone,
      street: cleanText(body.serviceStreet),
      zipCode: cleanText(body.serviceZipCode),
      city: cleanText(body.serviceCity),
      country: cleanText(body.serviceCountry) ?? "CH",
      notes: cleanText(body.customerNotes),
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
      message: "Estimates API works",
      data: {
        status: "success",
        message: "Estimates loaded",
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
      }
    );
  }
}

async function createDemoEstimate(prisma: PrismaClient) {
  const customer = await getOrCreateDemoCustomer(prisma);

  const serviceSlugs = [
    "endreinigung-oddanie-mieszkania",
    "mycie-okien",
    "dojazd",
  ];

  const services = await prisma.serviceCatalogItem.findMany({
    where: {
      tenantKey: TENANT_KEY,
      slug: {
        in: serviceSlugs,
      },
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  if (services.length === 0) {
    return NextResponse.json(
      {
        layer: "estimates-api",
        message: "No service catalog items found",
        data: {
          status: "error",
          message:
            "Brak pozycji w cenniku. Najpierw dodaj usługi w module Cennik.",
          estimate: null,
        },
      },
      {
        status: 400,
      }
    );
  }

  const quantityBySlug: Record<string, number> = {
    "endreinigung-oddanie-mieszkania": 80,
    "mycie-okien": 8,
    dojazd: 1,
  };

  const estimateItems = services.map((service, index) => {
    const quantity = positiveNumber(
      quantityBySlug[service.slug],
      decimalToNumber(service.defaultQuantity) || 1
    );

    const unitPrice = nonNegativeNumber(service.basePrice, 0);
    const minPrice = nonNegativeNumber(service.minPrice, 0);
    const riskMultiplier = positiveMultiplier(service.riskMultiplier, 1);

    const subtotal = quantity * unitPrice;
    const totalBeforeDiscount = Math.max(subtotal * riskMultiplier, minPrice);
    const riskAmount = Math.max(totalBeforeDiscount - subtotal, 0);

    return {
      serviceCatalogItemId: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      unit: service.unit,
      quantity: money(quantity),
      unitPrice: money(unitPrice),
      subtotal: money(subtotal),
      riskMultiplier: money(riskMultiplier),
      riskAmount: money(riskAmount),
      discountAmount: "0.00",
      total: money(totalBeforeDiscount),
      sortOrder: (index + 1) * 10,
      metadata: {
        serviceSlug: service.slug,
        source: "demo-estimate-api",
      },
    };
  });

  const subtotal = estimateItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  const riskAmount = estimateItems.reduce(
    (sum, item) => sum + Number(item.riskAmount),
    0
  );

  const total = estimateItems.reduce((sum, item) => sum + Number(item.total), 0);

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: createEstimateNumber(),
      tenantKey: TENANT_KEY,
      customerId: customer.id,
      status: "DRAFT",
      source: "ADMIN",
      title: "Demo wyceny: Endreinigung + okna",
      description:
        "Robocza wycena demo liczona z katalogu usług. Oficjalna cena wymaga zatwierdzenia przez właściciela.",
      serviceStreet: "Musterstrasse 1",
      serviceZipCode: "2502",
      serviceCity: "Biel/Bienne",
      serviceCountry: "CH",
      subtotal: money(subtotal),
      riskMultiplier: "1.00",
      riskAmount: money(riskAmount),
      travelFee: "0.00",
      materialFee: "0.00",
      discountAmount: "0.00",
      total: money(total),
      currency: "CHF",
      aiMinTotal: money(total * 0.9),
      aiMaxTotal: money(total * 1.15),
      aiNotes:
        "Demo widełek AI. To nie jest oficjalna cena dla klienta. Wymagana kontrola właściciela.",
      notesCustomer:
        "Cena orientacyjna. Dokładna oferta po potwierdzeniu zakresu i ewentualnych zdjęciach.",
      notesInternal:
        "Demo wyceny z katalogu usług. Następny etap: formularz tworzenia wyceny.",
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
    },
  });

  return NextResponse.json({
    layer: "estimates-api",
    message: "Demo estimate created",
    data: {
      status: "success",
      message: "Demo estimate created from service catalog",
      estimate,
    },
  });
}

async function createManualEstimate(
  prisma: PrismaClient,
  body: CreateEstimateBody
) {
  const customer = await getOrCreateManualCustomer(prisma, body);
  const manualItems = Array.isArray(body.items) ? body.items : [];

  if (manualItems.length === 0) {
    return NextResponse.json(
      {
        layer: "estimates-api",
        message: "No estimate items",
        data: {
          status: "error",
          message: "Dodaj przynajmniej jedną pozycję wyceny.",
          estimate: null,
        },
      },
      {
        status: 400,
      }
    );
  }

  const serviceIds = manualItems
    .map((item) => cleanText(item.serviceCatalogItemId))
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
    const catalogItemId = cleanText(item.serviceCatalogItemId);
    const catalogItem = catalogItemId ? catalogById.get(catalogItemId) : null;

    const quantity = positiveNumber(
      item.quantity,
      decimalToNumber(catalogItem?.defaultQuantity) || 1
    );

    const unitPrice = nonNegativeNumber(
      item.unitPrice,
      decimalToNumber(catalogItem?.basePrice) || 0
    );

    const riskMultiplier = positiveMultiplier(
      item.riskMultiplier,
      decimalToNumber(catalogItem?.riskMultiplier) || 1
    );

    const minPrice = nonNegativeNumber(catalogItem?.minPrice, 0);
    const subtotal = quantity * unitPrice;
    const itemTotalBeforeMin = subtotal * riskMultiplier;
    const itemTotal = Math.max(itemTotalBeforeMin, minPrice);
    const itemRiskAmount = Math.max(itemTotal - subtotal, 0);

    return {
      serviceCatalogItemId: catalogItem?.id ?? null,
      name:
        cleanText(item.itemName) ??
        catalogItem?.name ??
        `Pozycja ${index + 1}`,
      description:
        cleanText(item.itemDescription) ?? catalogItem?.description ?? null,

      // WAŻNE:
      // category i unit w Prisma są enumami.
      // Nie wolno tu wrzucać zwykłego tekstu z formularza,
      // bo TypeScript wywala błąd ServiceCatalogCategory.
      // Ręczne itemCategory/itemUnit zapisujemy niżej w metadata.
     category: catalogItem?.category ?? null,
unit: catalogItem?.unit ?? undefined,

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
        manualCategory: cleanText(item.itemCategory),
        manualUnit: cleanText(item.itemUnit),
      },
    };
  });

  const subtotal = estimateItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  const riskAmount = estimateItems.reduce(
    (sum, item) => sum + Number(item.riskAmount),
    0
  );

  const travelFee = nonNegativeNumber(body.travelFee, 0);
  const materialFee = nonNegativeNumber(body.materialFee, 0);
  const discountAmount = nonNegativeNumber(body.discountAmount, 0);

  const totalBeforeDiscount = subtotal + riskAmount + travelFee + materialFee;
  const total = Math.max(totalBeforeDiscount - discountAmount, 0);

  const averageRiskMultiplier =
    subtotal > 0 ? (subtotal + riskAmount) / subtotal : 1;

  const title =
    cleanText(body.title) ??
    `Wycena: ${estimateItems[0]?.name ?? "usługa HEXA CLEAN"}`;

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: createEstimateNumber(),
      tenantKey: TENANT_KEY,
      customerId: customer.id,
      status: "DRAFT",
      source: "ADMIN",
      title,
      description: cleanText(body.description),
      serviceStreet: cleanText(body.serviceStreet),
      serviceZipCode: cleanText(body.serviceZipCode),
      serviceCity: cleanText(body.serviceCity),
      serviceCountry: cleanText(body.serviceCountry) ?? "CH",
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
        "Automatyczne widełki robocze. Przed wysłaniem do klienta wymagana kontrola właściciela.",
      notesCustomer:
        cleanText(body.notesCustomer) ??
        "Cena orientacyjna. Ostateczna oferta po potwierdzeniu zakresu.",
      notesInternal:
        cleanText(body.notesInternal) ??
        "Wycena utworzona ręcznie w panelu dashboard.",
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
      message: "Manual estimate created from dashboard form",
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
            message: "Nieprawidłowy JSON w żądaniu.",
            estimate: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    if (isManualEstimateBody(body)) {
      return createManualEstimate(prisma, body);
    }

    return createDemoEstimate(prisma);
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
      }
    );
  }
}