import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";
import {
  calculateAutomatedInvoiceState,
  calculatePaidPaymentsTotal,
  decimalToNumber,
  invoiceAutomationChanged,
  moneyString,
  normalizeInvoiceCurrency,
} from "@/lib/dashboard/invoice-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type UpdateInvoiceBody = {
  invoiceNumber?: string;
  status?: string;
  issueDate?: string;
  dueDate?: string | null;
  sentAt?: string | null;
  subtotal?: string | number;
  taxRate?: string | number;
  taxAmount?: string | number;
  total?: string | number;
  paidAmount?: string | number;
  currency?: string;
  notes?: string | null;
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

  return moneyString(parsed);
}

function cleanDate(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function cleanStatus(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();

  if (raw === "CANCELED") {
    return "CANCELLED";
  }

  return raw;
}

function createInvoiceSnapshot(invoice: {
  invoiceNumber: string;
  status: string;
  subtotal?: unknown;
  taxRate?: unknown;
  taxAmount?: unknown;
  total?: unknown;
  paidAmount?: unknown;
  currency: string;
  dueDate?: Date | null;
  sentAt?: Date | null;
  paidAt?: Date | null;
  notes?: string | null;
}) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: decimalToNumber(invoice.subtotal).toFixed(2),
    taxRate: decimalToNumber(invoice.taxRate).toFixed(2),
    taxAmount: decimalToNumber(invoice.taxAmount).toFixed(2),
    total: decimalToNumber(invoice.total).toFixed(2),
    paidAmount: decimalToNumber(invoice.paidAmount).toFixed(2),
    currency: invoice.currency,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    notes: invoice.notes ?? null,
  };
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
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          layer: "invoice-details-api",
          message: "Invoice not found",
          data: {
            status: "error",
            message: "Rechnung wurde nicht gefunden.",
            invoice: null,
          },
        },
        {
          status: 404,
        },
      );
    }

    const paidPaymentsTotal = calculatePaidPaymentsTotal(invoice.payments);

    const nextState = calculateAutomatedInvoiceState({
      currentStatus: invoice.status,
      total: invoice.total,
      paidPaymentsTotal,
      dueDate: invoice.dueDate,
      sentAt: invoice.sentAt,
      paidAt: invoice.paidAt,
    });

    const shouldUpdateInvoice =
      invoice.status !== "CANCELLED" &&
      invoiceAutomationChanged(invoice, nextState);

    const invoiceForResponse = shouldUpdateInvoice
      ? await prisma.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: nextState.status,
            paidAmount: moneyString(nextState.paidAmount),
            paidAt: nextState.paidAt,
          },
          include: {
            customer: true,
            order: true,
            payments: true,
          },
        })
      : invoice;

    if (shouldUpdateInvoice && invoice.status !== invoiceForResponse.status) {
      await prisma.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          action: "STATUS_CHANGE",
          entityType: "Invoice",
          entityId: invoice.id,
          actorType: "system",
          message: `Invoice ${invoice.invoiceNumber} status changed automatically from ${invoice.status} to ${invoiceForResponse.status}.`,
          before: {
            status: invoice.status,
            paidAmount: decimalToNumber(invoice.paidAmount),
          },
          after: {
            status: invoiceForResponse.status,
            paidAmount: nextState.paidAmount,
            paidAt: invoiceForResponse.paidAt?.toISOString() ?? null,
          },
          metadata: {
            source: "invoice-details-get-automation",
            total: decimalToNumber(invoice.total),
            paidPaymentsTotal,
          },
        },
      });
    }

    return NextResponse.json({
      layer: "invoice-details-api",
      message: "Invoice loaded",
      data: {
        status: "success",
        message: "Rechnung wurde geladen.",
        invoice: invoiceForResponse,
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
            error instanceof Error
              ? error.message
              : "Unknown invoice GET error",
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
            message: "Ungültige Rechnungsdaten.",
            invoice: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const existingInvoice = await tx.invoice.findUnique({
        where: {
          id,
        },
        include: {
          payments: true,
        },
      });

      if (!existingInvoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      const updateData: Record<string, unknown> = {};

      if (hasField(body, "invoiceNumber")) {
        updateData.invoiceNumber =
          cleanText(body.invoiceNumber) ?? existingInvoice.invoiceNumber;
      }

      const requestedStatus = hasField(body, "status")
        ? cleanStatus(body.status)
        : null;

      if (requestedStatus) {
        if (!allowedStatuses.includes(requestedStatus)) {
          throw new Error(`INVALID_STATUS:${requestedStatus}`);
        }

        if (requestedStatus === "CANCELLED") {
          updateData.status = "CANCELLED";
        }

        if (requestedStatus === "SENT") {
          updateData.sentAt = existingInvoice.sentAt ?? new Date();
        }

        if (requestedStatus === "DRAFT" && !existingInvoice.paidAt) {
          updateData.sentAt = null;
        }
      }

      if (hasField(body, "issueDate")) {
        const nextIssueDate = cleanDate(body.issueDate);

        if (!nextIssueDate) {
          throw new Error("INVALID_ISSUE_DATE");
        }

        updateData.issueDate = nextIssueDate;
      }

      if (hasField(body, "dueDate")) {
        updateData.dueDate = cleanDate(body.dueDate);
      }

      if (hasField(body, "sentAt")) {
        updateData.sentAt = cleanDate(body.sentAt);
      }

      if (hasField(body, "subtotal")) {
        const nextSubtotal = cleanMoney(body.subtotal);

        if (nextSubtotal === null) {
          throw new Error("INVALID_SUBTOTAL");
        }

        updateData.subtotal = nextSubtotal;
      }

      if (hasField(body, "taxRate")) {
        const nextTaxRate = cleanMoney(body.taxRate);

        if (nextTaxRate === null) {
          throw new Error("INVALID_TAX_RATE");
        }

        updateData.taxRate = nextTaxRate;
      }

      if (hasField(body, "taxAmount")) {
        const nextTaxAmount = cleanMoney(body.taxAmount);

        if (nextTaxAmount === null) {
          throw new Error("INVALID_TAX_AMOUNT");
        }

        updateData.taxAmount = nextTaxAmount;
      }

      if (hasField(body, "total")) {
        const nextTotal = cleanMoney(body.total);

        if (nextTotal === null) {
          throw new Error("INVALID_TOTAL");
        }

        updateData.total = nextTotal;
      }

      /*
       * paidAmount is intentionally not accepted as a manual edit.
       * It is recalculated from PAID payments below.
       */

      if (hasField(body, "currency")) {
        updateData.currency = normalizeInvoiceCurrency(body.currency);
      } else if (
        existingInvoice.currency !==
        normalizeInvoiceCurrency(existingInvoice.currency)
      ) {
        updateData.currency = normalizeInvoiceCurrency(existingInvoice.currency);
      }

      if (hasField(body, "notes")) {
        updateData.notes = cleanText(body.notes);
      }

      const invoiceAfterManualFields = await tx.invoice.update({
        where: {
          id,
        },
        data: updateData,
        include: {
          payments: true,
        },
      });

      const paidPaymentsTotal = calculatePaidPaymentsTotal(
        invoiceAfterManualFields.payments,
      );

      const nextState = calculateAutomatedInvoiceState({
        currentStatus: invoiceAfterManualFields.status,
        total: invoiceAfterManualFields.total,
        paidPaymentsTotal,
        dueDate: invoiceAfterManualFields.dueDate,
        sentAt: invoiceAfterManualFields.sentAt,
        paidAt: invoiceAfterManualFields.paidAt,
      });

      const shouldApplyAutomation =
        invoiceAfterManualFields.status !== "CANCELLED" &&
        invoiceAutomationChanged(invoiceAfterManualFields, nextState);

      const finalInvoice = shouldApplyAutomation
        ? await tx.invoice.update({
            where: {
              id,
            },
            data: {
              status: nextState.status,
              paidAmount: moneyString(nextState.paidAmount),
              paidAt: nextState.paidAt,
            },
            include: {
              customer: true,
              order: true,
              payments: true,
            },
          })
        : await tx.invoice.findUniqueOrThrow({
            where: {
              id,
            },
            include: {
              customer: true,
              order: true,
              payments: true,
            },
          });

      await tx.auditLog.create({
        data: {
          customerId: existingInvoice.customerId,
          orderId: existingInvoice.orderId,
          action: "UPDATE",
          entityType: "Invoice",
          entityId: finalInvoice.id,
          actorType: "admin",
          message: `Invoice ${finalInvoice.invoiceNumber} updated.`,
          before: createInvoiceSnapshot(existingInvoice),
          after: createInvoiceSnapshot(finalInvoice),
          metadata: {
            source: "invoice-update-api",
            ignoredManualFields: hasField(body, "paidAmount")
              ? ["paidAmount"]
              : [],
            requestedStatus,
          },
        },
      });

      if (
        existingInvoice.status !== finalInvoice.status ||
        decimalToNumber(existingInvoice.paidAmount) !==
          decimalToNumber(finalInvoice.paidAmount)
      ) {
        await tx.auditLog.create({
          data: {
            customerId: existingInvoice.customerId,
            orderId: existingInvoice.orderId,
            action: "STATUS_CHANGE",
            entityType: "Invoice",
            entityId: finalInvoice.id,
            actorType: "system",
            message: `Invoice ${finalInvoice.invoiceNumber} automation updated status from ${existingInvoice.status} to ${finalInvoice.status}.`,
            before: {
              status: existingInvoice.status,
              paidAmount: decimalToNumber(existingInvoice.paidAmount),
            },
            after: {
              status: finalInvoice.status,
              paidAmount: decimalToNumber(finalInvoice.paidAmount),
              paidAt: finalInvoice.paidAt?.toISOString() ?? null,
            },
            metadata: {
              source: "invoice-update-automation",
              total: decimalToNumber(finalInvoice.total),
              paidPaymentsTotal,
            },
          },
        });
      }

      return finalInvoice;
    });

    return NextResponse.json({
      layer: "invoice-update-api",
      message: "Invoice updated",
      data: {
        status: "success",
        message: "Rechnung wurde gespeichert.",
        invoice: result,
      },
    });
  } catch (error) {
    console.error("Invoice PATCH error:", error);

    if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: "Invoice not found",
          data: {
            status: "error",
            message: "Rechnung wurde nicht gefunden.",
            invoice: null,
          },
        },
        {
          status: 404,
        },
      );
    }

    if (error instanceof Error && error.message.startsWith("INVALID_STATUS:")) {
      const status = error.message.replace("INVALID_STATUS:", "");

      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: "Invalid invoice status",
          data: {
            status: "error",
            message: `Ungültiger Rechnungsstatus: ${status}`,
            invoice: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    const validationMessages: Record<string, string> = {
      INVALID_ISSUE_DATE: "Ungültiges Rechnungsdatum.",
      INVALID_SUBTOTAL: "Ungültige Zwischensumme.",
      INVALID_TAX_RATE: "Ungültiger Steuersatz.",
      INVALID_TAX_AMOUNT: "Ungültiger Steuerbetrag.",
      INVALID_TOTAL: "Ungültiger Rechnungsbetrag.",
    };

    if (error instanceof Error && validationMessages[error.message]) {
      return NextResponse.json(
        {
          layer: "invoice-update-api",
          message: error.message,
          data: {
            status: "error",
            message: validationMessages[error.message],
            invoice: null,
          },
        },
        {
          status: 400,
        },
      );
    }

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
      },
    );
  }
}