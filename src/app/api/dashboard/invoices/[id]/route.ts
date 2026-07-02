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
  subtotal?: string | number;
  taxRate?: string | number;
  taxAmount?: string | number;
  total?: string | number;
  paidAmount?: string | number;
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

function hasField(body: UpdateInvoiceBody, key: keyof UpdateInvoiceBody) {
  return Object.prototype.hasOwnProperty.call(body, key);
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
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
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

function cleanCurrency(value: unknown) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) {
    return raw;
  }

  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function cleanStatus(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();

  if (raw === "CANCELED") return "CANCELLED";

  return raw;
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
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
        },
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
          message: error instanceof Error ? error.message : "Unknown invoice GET error",
          invoice: null,
        },
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
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
        },
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
        },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (hasField(body, "invoiceNumber")) {
      updateData.invoiceNumber = cleanText(body.invoiceNumber) ?? existingInvoice.invoiceNumber;
    }

    if (hasField(body, "status")) {
      const nextStatus = cleanStatus(body.status);

      if (!allowedStatuses.includes(nextStatus)) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid invoice status",
            data: {
              status: "error",
              message: `Nieprawidłowy status faktury: ${nextStatus}`,
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.status = nextStatus;
    }

    if (hasField(body, "issueDate")) {
      const nextIssueDate = cleanDate(body.issueDate);

      if (!nextIssueDate) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid issue date",
            data: {
              status: "error",
              message: "Nieprawidłowa data faktury.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.issueDate = nextIssueDate;
    }

    if (hasField(body, "dueDate")) {
      updateData.dueDate = cleanDate(body.dueDate);
    }

    if (hasField(body, "subtotal")) {
      const nextSubtotal = cleanMoney(body.subtotal);

      if (nextSubtotal === null) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid subtotal",
            data: {
              status: "error",
              message: "Nieprawidłowy subtotal.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.subtotal = nextSubtotal;
    }

    if (hasField(body, "taxRate")) {
      const nextTaxRate = cleanMoney(body.taxRate);

      if (nextTaxRate === null) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid tax rate",
            data: {
              status: "error",
              message: "Nieprawidłowy podatek procentowy.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.taxRate = nextTaxRate;
    }

    if (hasField(body, "taxAmount")) {
      const nextTaxAmount = cleanMoney(body.taxAmount);

      if (nextTaxAmount === null) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid tax amount",
            data: {
              status: "error",
              message: "Nieprawidłowa kwota podatku.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.taxAmount = nextTaxAmount;
    }

    if (hasField(body, "total")) {
      const nextTotal = cleanMoney(body.total);

      if (nextTotal === null) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid total",
            data: {
              status: "error",
              message: "Nieprawidłowy total.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.total = nextTotal;
    }

    if (hasField(body, "paidAmount")) {
      const nextPaidAmount = cleanMoney(body.paidAmount);

      if (nextPaidAmount === null) {
        return NextResponse.json(
          {
            layer: "invoice-update-api",
            message: "Invalid paid amount",
            data: {
              status: "error",
              message: "Nieprawidłowa kwota zapłacona.",
              invoice: null,
            },
          },
          {
            status: 400,
          },
        );
      }

      updateData.paidAmount = nextPaidAmount;
    }

    if (hasField(body, "currency")) {
      updateData.currency = cleanCurrency(body.currency);
    } else if (existingInvoice.currency !== cleanCurrency(existingInvoice.currency)) {
      updateData.currency = cleanCurrency(existingInvoice.currency);
    }

    if (hasField(body, "notes")) {
      updateData.notes = cleanText(body.notes);
    }

    const updatedInvoice = await prisma.invoice.update({
      where: {
        id,
      },
      data: updateData,
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
          message: error instanceof Error ? error.message : "Unknown invoice PATCH error",
          invoice: null,
        },
      },
      {
        status: 500,
      },
    );
  }
}