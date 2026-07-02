import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type UpdateInvoiceBody = {
  invoiceNumber?: string;
  status?: string;
  issueDate?: string;
  dueDate?: string;
  subtotal?: string;
  taxRate?: string;
  taxAmount?: string;
  total?: string;
  paidAmount?: string;
  currency?: string;
  notes?: string;
};

const allowedStatuses = [
  "DRAFT",
  "SENT",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
  "CANCELED",
];

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

async function readBody(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as UpdateInvoiceBody;
  } catch {
    return null;
  }
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function cleanMoney(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "0.00";
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return (Math.round((parsed + Number.EPSILON) * 100) / 100).toFixed(2);
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        order: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          layer: "invoice-details-api",
          message: "Invoice not found",
          data: {
            status: "error",
            message: "Nie znaleziono faktury.",
            invoice: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      layer: "invoice-details-api",
      message: "Invoice loaded",
      data: {
        status: "success",
        message: "Faktura została pobrana.",
        invoice,
      },
    });
  } catch (error) {
    console.error("Invoice GET error:", error);

    return NextResponse.json(
      {
        layer: "invoice-details-api",
        message: "Invoice GET error",
        data: {
          status: "error",
          message:
            error instanceof Error ? error.message : "Unknown invoice GET error",
          invoice: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
    const body = await readBody(request);

    if (!body) {
      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: "Invalid body",
          data: {
            status: "error",
            message: "Nieprawidłowe dane faktury.",
            invoice: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const prisma = getPrisma();

    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: "Invoice not found",
          data: {
            status: "error",
            message: "Nie znaleziono faktury.",
            invoice: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    const nextStatusRaw = cleanText(body.status) ?? existingInvoice.status;

    if (nextStatusRaw && !allowedStatuses.includes(nextStatusRaw)) {
      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: "Invalid invoice status",
          data: {
            status: "error",
            message: "Nieprawidłowy status faktury.",
            invoice: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const nextStatus = nextStatusRaw as typeof existingInvoice.status;

    const updatedInvoice = await prisma.invoice.update({
      where: {
        id,
      },
      data: {
        invoiceNumber:
          cleanText(body.invoiceNumber) ?? existingInvoice.invoiceNumber,
        status: nextStatus,
        issueDate: cleanDate(body.issueDate) ?? existingInvoice.issueDate,
        dueDate: cleanDate(body.dueDate) ?? existingInvoice.dueDate,
        subtotal: cleanMoney(body.subtotal),
        taxRate: cleanMoney(body.taxRate),
        taxAmount: cleanMoney(body.taxAmount),
        total: cleanMoney(body.total),
        paidAmount: cleanMoney(body.paidAmount),
        currency: cleanText(body.currency) ?? existingInvoice.currency ?? "CHF",
        notes: cleanText(body.notes),
      },
      include: {
        customer: true,
        order: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        customerId: existingInvoice.customerId,
        orderId: existingInvoice.orderId,
        action: "UPDATE",
        entityType: "Invoice",
        entityId: updatedInvoice.id,
        actorType: "admin",
        message: `Invoice ${updatedInvoice.invoiceNumber} manually updated.`,
        before: {
          invoiceNumber: existingInvoice.invoiceNumber,
          status: existingInvoice.status,
          subtotal: existingInvoice.subtotal?.toString(),
          taxRate: existingInvoice.taxRate?.toString(),
          taxAmount: existingInvoice.taxAmount?.toString(),
          total: existingInvoice.total?.toString(),
          paidAmount: existingInvoice.paidAmount?.toString(),
          currency: existingInvoice.currency,
          dueDate: existingInvoice.dueDate?.toISOString(),
        },
        after: {
          invoiceNumber: updatedInvoice.invoiceNumber,
          status: updatedInvoice.status,
          subtotal: updatedInvoice.subtotal?.toString(),
          taxRate: updatedInvoice.taxRate?.toString(),
          taxAmount: updatedInvoice.taxAmount?.toString(),
          total: updatedInvoice.total?.toString(),
          paidAmount: updatedInvoice.paidAmount?.toString(),
          currency: updatedInvoice.currency,
          dueDate: updatedInvoice.dueDate?.toISOString(),
        },
        metadata: {
          source: "invoice-update-api",
        },
      },
    });

    return NextResponse.json({
      layer: "invoice-update-api",
      message: "Invoice updated",
      data: {
        status: "success",
        message: "Faktura została zapisana.",
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    console.error("Invoice PATCH error:", error);

    return NextResponse.json(
      {
        layer: "invoice-update-api",
        message: "Invoice PATCH error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown invoice PATCH error",
          invoice: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}