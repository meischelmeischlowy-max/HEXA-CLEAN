import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
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

function money(value: unknown) {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0.00";
  }

  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
}

function createInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${date}-${random}`;
}

function dueDateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
        order: true,
        session: true,
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
          layer: "estimate-invoice-api",
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

    if (!["ACCEPTED", "SENT", "READY_TO_SEND"].includes(estimate.status)) {
      return NextResponse.json(
        {
          layer: "estimate-invoice-api",
          message: "Estimate status does not allow invoice creation",
          data: {
            status: "error",
            message:
              "Fakturę twórz dopiero z wyceny gotowej, wysłanej albo zaakceptowanej.",
            invoice: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        customerId: estimate.customerId,
        notes: {
          contains: `Estimate ID: ${estimate.id}`,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingInvoice) {
      return NextResponse.json({
        layer: "estimate-invoice-api",
        message: "Invoice already exists for this estimate",
        data: {
          status: "success",
          message: "Faktura dla tej wyceny już istnieje.",
          invoice: existingInvoice,
        },
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(),
        customerId: estimate.customerId,
        orderId: estimate.orderId,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: dueDateInDays(14),
        subtotal: money(estimate.subtotal),
        taxRate: "0.00",
        taxAmount: "0.00",
        total: money(estimate.total),
        paidAmount: "0.00",
        currency: estimate.currency ?? "CHF",
        notes: [
          `Invoice generated from estimate ${estimate.estimateNumber}.`,
          `Estimate ID: ${estimate.id}`,
          estimate.notesCustomer ? `Customer notes: ${estimate.notesCustomer}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    await prisma.auditLog.create({
      data: {
        customerId: estimate.customerId,
        orderId: estimate.orderId,
        sessionId: estimate.sessionId,
    action: "CREATE",
        entityType: "Invoice",
        entityId: invoice.id,
        actorType: "admin",
        message: `Invoice ${invoice.invoiceNumber} created from estimate ${estimate.estimateNumber}.`,
        after: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          estimateId: estimate.id,
          estimateNumber: estimate.estimateNumber,
          total: money(estimate.total),
        },
        metadata: {
          source: "estimate-invoice-api",
          estimateId: estimate.id,
          estimateNumber: estimate.estimateNumber,
        },
      },
    });

    return NextResponse.json({
      layer: "estimate-invoice-api",
      message: "Invoice created from estimate",
      data: {
        status: "success",
        message: "Faktura została utworzona z wyceny.",
        invoice,
      },
    });
  } catch (error) {
    console.error("Create invoice from estimate error:", error);

    return NextResponse.json(
      {
        layer: "estimate-invoice-api",
        message: "Create invoice from estimate error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown create invoice from estimate error",
          invoice: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}