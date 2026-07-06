import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function normalizeInvoiceCurrency(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (raw === "CHF" || raw.startsWith("CHF")) {
    return "CHF";
  }

  if (raw === "EUR" || raw.startsWith("EUR")) {
    return "EUR";
  }

  if (raw === "USD" || raw.startsWith("USD")) {
    return "USD";
  }

  return "CHF";
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value.replace(",", "."));
    return Number.isFinite(number) ? number : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const number = Number(value.toString());
    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function money(value: number) {
  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function createInvoiceCandidateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${date}-${random}`;
}

async function createInvoiceNumber(prisma: PrismaClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const invoiceNumber = createInvoiceCandidateNumber();

    const existing = await prisma.invoice.findUnique({
      where: {
        invoiceNumber,
      },
    });

    if (!existing) {
      return invoiceNumber;
    }
  }

  throw new Error("Could not generate unique invoice number");
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function readBody(request: NextRequest) {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        order: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      layer: "dashboard-invoices-api",
      message: "Dashboard invoices works",
      data: {
        status: "success",
        message: "Invoices loaded",
        invoices,
      },
    });
  } catch (error) {
    console.error("Dashboard invoices GET failed:", error);

    return NextResponse.json(
      {
        layer: "dashboard-invoices-api",
        message: "Dashboard invoices failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown invoices GET error",
          invoices: [],
        },
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const body = await readBody(request);

    const estimateId =
      typeof body.estimateId === "string" ? body.estimateId.trim() : "";

    if (!estimateId) {
      return NextResponse.json(
        {
          layer: "dashboard-invoices-api",
          message: "Missing estimateId",
          data: {
            status: "error",
            message: "Brak estimateId. Nie można utworzyć faktury z wyceny.",
            invoice: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const estimate = await prisma.estimate.findUnique({
      where: {
        id: estimateId,
      },
      include: {
        customer: true,
        order: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "dashboard-invoices-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Nie znaleziono wyceny.",
            invoice: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    const estimateReference = estimate.estimateNumber ?? estimate.id;

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        customerId: estimate.customerId,
        notes: {
          contains: estimateReference,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingInvoice) {
      return NextResponse.json({
        layer: "dashboard-invoices-api",
        message: "Invoice already exists for estimate",
        data: {
          status: "success",
          message: "Invoice already exists for this estimate",
          invoice: existingInvoice,
        },
      });
    }

    const now = new Date();
    const total = decimalToNumber(estimate.total);
    const invoiceNumber = await createInvoiceNumber(prisma);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: estimate.customerId,
        orderId: estimate.orderId ?? null,
        status: "DRAFT",
        issueDate: now,
        dueDate: addDays(now, 14),
        subtotal: money(total),
        taxRate: "0.00",
        taxAmount: "0.00",
        total: money(total),
        paidAmount: "0.00",
        currency: normalizeInvoiceCurrency(estimate.currency),
        notes:
          `Erstellt aus Angebot ${estimateReference}. ` +
          "Leistungsumfang gemäss Angebot. Diese Rechnung wurde mit HEXA OS CRM erstellt.",
      },
      include: {
        customer: true,
        order: true,
        payments: true,
        attachments: true,
      },
    });

    return NextResponse.json({
      layer: "dashboard-invoices-api",
      message: "Invoice created from estimate",
      data: {
        status: "success",
        message: "Invoice created from estimate",
        invoice,
      },
    });
  } catch (error) {
    console.error("Dashboard invoices POST failed:", error);

    return NextResponse.json(
      {
        layer: "dashboard-invoices-api",
        message: "Dashboard invoices POST failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown invoice create error",
          invoice: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}