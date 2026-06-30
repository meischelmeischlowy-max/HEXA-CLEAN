import { PrismaClient, ServiceCatalogUnit } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
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
  itemName?: string;
  itemDescription?: string;
  itemCategory?: string;
  itemUnit?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  riskMultiplier?: string | number;
  travelFee?: string | number;
  materialFee?: string | number;
  discountAmount?: string | number;
  notesCustomer?: string;
  notesInternal?: string;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
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
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(",", ".");
    return Number(normalizedValue);
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

function positiveNumber(value: unknown, fallback = 0) {
  const number = decimalToNumber(value);

  if (!Number.isFinite(number) || number < 0) {
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

async function readBody(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as CreateEstimateBody;
  } catch {
    return null;
  }
}

function isManualEstimateBody(
  body: CreateEstimateBody | null
): body is CreateEstimateBody {
  if (!body) {
    return false;
  }

  if (body.mode === "manual") {
    return true;
  }

  return Boolean(
    body.firstName ||
      body.lastName ||
      body.companyName ||
      body.email ||
      body.phone ||
      body.title ||
      body.serviceCity ||
      body.itemName
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
      where: {
        email,
      },
    });

    if (existingByEmail) {
      return existingByEmail;
    }
  }

  if (phone) {
    const existingByPhone = await prisma.customer.findFirst({
      where: {
        phone,
      },
    });

    if (existingByPhone) {
      return existingByPhone;
    }
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
            "Brak pozycji w cenniku. Najpierw kliknij „Dodaj przykładowy cennik” w module Cennik.",
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
    const quantity =
      quantityBySlug[service.slug] ??
      decimalToNumber(service.defaultQuantity) ??
      1;

    const unitPrice = decimalToNumber(service.basePrice);
    const minPrice = decimalToNumber(service.minPrice);
    const riskMultiplier = decimalToNumber(service.riskMultiplier) || 1;

    const subtotal = quantity * unitPrice;
    const totalBeforeDiscount = Math.max(subtotal * riskMultiplier, minPrice);
    const discountAmount = 0;
    const total = Math.max(totalBeforeDiscount - discountAmount, 0);
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
      discountAmount: money(discountAmount),
      total: money(total),
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
  const discountAmount = estimateItems.reduce(
    (sum, item) => sum + Number(item.discountAmount),
    0
  );
  const total = estimateItems.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

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
      discountAmount: money(discountAmount),
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
      notifications: {
        create: {
          customerId: customer.id,
          channel: "SYSTEM",
          status: "PENDING",
          recipient: "owner",
          subject: "Nowa demo-wycena HEXA CLEAN",
          message: `Nowa wycena demo: Endreinigung + okna. Suma: ${money(
            total
          )} CHF. Wymaga zatwierdzenia właściciela.`,
          metadata: {
            source: "demo-estimate-api",
          },
        },
      },
      auditLogs: {
        create: {
          customerId: customer.id,
          action: "CREATE",
          entityType: "Estimate",
          actorType: "system",
          message: "Demo estimate created from service catalog.",
          after: {
            subtotal: money(subtotal),
            riskAmount: money(riskAmount),
            discountAmount: money(discountAmount),
            total: money(total),
          },
          metadata: {
            source: "demo-estimate-api",
          },
        },
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

  const quantity = positiveNumber(body.quantity, 1);
  const unitPrice = positiveNumber(body.unitPrice, 0);
  const riskMultiplier = positiveMultiplier(body.riskMultiplier, 1);
  const travelFee = positiveNumber(body.travelFee, 0);
  const materialFee = positiveNumber(body.materialFee, 0);
  const discountAmount = positiveNumber(body.discountAmount, 0);

  const itemSubtotal = quantity * unitPrice;
  const itemTotalBeforeDiscount = itemSubtotal * riskMultiplier;
  const itemRiskAmount = Math.max(itemTotalBeforeDiscount - itemSubtotal, 0);

  const subtotal = itemSubtotal;
  const riskAmount = itemRiskAmount;
  const totalBeforeDiscount = subtotal + riskAmount + travelFee + materialFee;
  const total = Math.max(totalBeforeDiscount - discountAmount, 0);

  const title =
    cleanText(body.title) ??
    `Wycena: ${cleanText(body.itemName) ?? "usługa HEXA CLEAN"}`;

  const itemName = cleanText(body.itemName) ?? "Usługa HEXA CLEAN";

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
      riskMultiplier: money(riskMultiplier),
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
        create: {
          name: itemName,
          description: cleanText(body.itemDescription),
          unit:
            (cleanText(body.itemUnit) as ServiceCatalogUnit) ?? ServiceCatalogUnit.CUSTOM,
          quantity: money(quantity),
          unitPrice: money(unitPrice),
          subtotal: money(itemSubtotal),
          riskMultiplier: money(riskMultiplier),
          riskAmount: money(itemRiskAmount),
          discountAmount: "0.00",
          total: money(itemTotalBeforeDiscount),
          sortOrder: 10,
          metadata: {
            source: "manual-estimate-api",
            category: cleanText(body.itemCategory),
          },
        },
      },
      notifications: {
        create: {
          customerId: customer.id,
          channel: "SYSTEM",
          status: "PENDING",
          recipient: "owner",
          subject: "Nowa ręczna wycena HEXA CLEAN",
          message: `Nowa ręczna wycena: ${title}. Suma: ${money(
            total
          )} CHF. Wymaga kontroli właściciela.`,
          metadata: {
            source: "manual-estimate-api",
          },
        },
      },
      auditLogs: {
        create: {
          customerId: customer.id,
          action: "CREATE",
          entityType: "Estimate",
          actorType: "admin",
          message: "Manual estimate created from dashboard form.",
          after: {
            title,
            subtotal: money(subtotal),
            riskAmount: money(riskAmount),
            travelFee: money(travelFee),
            materialFee: money(materialFee),
            discountAmount: money(discountAmount),
            total: money(total),
          },
          metadata: {
            source: "manual-estimate-api",
          },
        },
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
    const body = await readBody(request);

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