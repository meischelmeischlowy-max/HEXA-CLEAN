import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";
import {
  sendPaymentConfirmationWorkflow,
} from "@/lib/payment-confirmation-service";
import {
  calculateAutomatedInvoiceState,
  calculatePaidPaymentsTotal,
  decimalToNumber,
  invoiceAutomationChanged,
  moneyString,
  normalizeInvoiceCurrency,
  roundMoney,
} from "@/lib/dashboard/invoice-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type CreatePaymentBody = {
  invoiceId?: string;
  amount?: string | number;
  method?: string;
  status?: string;
  externalRef?: string;
  notes?: string;
  paidAt?: string;
};

const paymentStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "CANCELLED",
] as const;

const paymentMethods = [
  "CASH",
  "BANK_TRANSFER",
  "TWINT",
  "CARD",
  "OTHER",
] as const;

type PaymentStatusInput = (typeof paymentStatuses)[number];
type PaymentMethodInput = (typeof paymentMethods)[number];

function isPaymentStatus(value: string): value is PaymentStatusInput {
  return paymentStatuses.some((status) => status === value);
}

function isPaymentMethod(value: string): value is PaymentMethodInput {
  return paymentMethods.some((method) => method === value);
}

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
    return JSON.parse(text) as CreatePaymentBody;
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
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return roundMoney(parsed).toFixed(2);
}

function cleanPaymentStatus(value: unknown): PaymentStatusInput {
  const raw = String(value || "PAID").trim().toUpperCase();

  if (raw === "CANCELED") {
    return "CANCELLED";
  }

  return isPaymentStatus(raw) ? raw : "PAID";
}

function cleanPaymentMethod(value: unknown): PaymentMethodInput {
  const raw = String(value || "BANK_TRANSFER").trim().toUpperCase();

  return isPaymentMethod(raw) ? raw : "BANK_TRANSFER";
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

export async function GET() {
  try {
    const prisma = getPrisma();

    const [payments, invoices] = await Promise.all([
      prisma.payment.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          order: true,
        },
      }),
      prisma.invoice.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          customer: true,
        },
      }),
    ]);

    return NextResponse.json({
      layer: "dashboard-payments-api",
      message: "Dashboard payments loaded",
      data: {
        status: "success",
        message: "Zahlungen wurden geladen.",
        payments,
        invoices,
      },
    });
  } catch (error) {
    console.error("Payments GET error:", error);

    return NextResponse.json(
      {
        layer: "dashboard-payments-api",
        message: "Dashboard payments failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown payments GET error",
          payments: [],
          invoices: [],
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);

    if (!body) {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Invalid body",
          data: {
            status: "error",
            message: "Ungültige Zahlungsdaten.",
            payment: null,
            invoice: null,
          },
        },
        { status: 400 },
      );
    }

    const invoiceId = cleanText(body.invoiceId);
    const amount = cleanMoney(body.amount);

    if (!invoiceId) {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Missing invoice",
          data: {
            status: "error",
            message: "Wählen Sie eine Rechnung für die Zahlung aus.",
            payment: null,
            invoice: null,
          },
        },
        { status: 400 },
      );
    }

    if (amount === null || decimalToNumber(amount) <= 0) {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Invalid amount",
          data: {
            status: "error",
            message: "Geben Sie einen gültigen Zahlungsbetrag ein.",
            payment: null,
            invoice: null,
          },
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id: invoiceId,
        },
        include: {
          payments: true,
        },
      });

      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      if (invoice.status === "CANCELLED") {
        throw new Error("INVOICE_CANCELLED");
      }

      const paymentStatus = cleanPaymentStatus(body.status);
      const method = cleanPaymentMethod(body.method);
      const currency = normalizeInvoiceCurrency(invoice.currency);
      const paymentPaidAt =
        paymentStatus === "PAID"
          ? cleanDate(body.paidAt) ?? new Date()
          : null;

      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          amount,
          currency,
          status: paymentStatus,
          method,
          externalRef: cleanText(body.externalRef),
          notes: cleanText(body.notes),
          paidAt: paymentPaidAt,
        },
      });

      const paidPaymentsTotal = roundMoney(
        calculatePaidPaymentsTotal(invoice.payments) +
          (paymentStatus === "PAID" ? decimalToNumber(amount) : 0),
      );

      const nextState = calculateAutomatedInvoiceState({
        currentStatus: invoice.status,
        total: invoice.total,
        paidPaymentsTotal,
        dueDate: invoice.dueDate,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
        now: paymentPaidAt ?? new Date(),
      });

      const shouldUpdateInvoice = invoiceAutomationChanged(invoice, nextState);

      const updatedInvoice = shouldUpdateInvoice
        ? await tx.invoice.update({
            where: {
              id: invoice.id,
            },
            data: {
              paidAmount: moneyString(nextState.paidAmount),
              status: nextState.status,
              paidAt: nextState.paidAt,
              currency,
            },
          })
        : invoice;

      await tx.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          action: "CREATE",
          entityType: "Payment",
          entityId: createdPayment.id,
          actorType: "admin",
          message: `Payment ${createdPayment.amount.toString()} ${
            createdPayment.currency
          } created for invoice ${invoice.invoiceNumber}.`,
          after: {
            paymentId: createdPayment.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: createdPayment.amount.toString(),
            currency: createdPayment.currency,
            status: createdPayment.status,
            method: createdPayment.method,
            paidAt: createdPayment.paidAt?.toISOString() ?? null,
          },
          metadata: {
            source: "dashboard-payments-api",
          },
        },
      });

      if (invoice.status !== updatedInvoice.status) {
        await tx.auditLog.create({
          data: {
            customerId: invoice.customerId,
            orderId: invoice.orderId,
            action: "STATUS_CHANGE",
            entityType: "Invoice",
            entityId: invoice.id,
            actorType: "system",
            message: `Invoice ${invoice.invoiceNumber} status changed automatically from ${invoice.status} to ${updatedInvoice.status}.`,
            before: {
              status: invoice.status,
              paidAmount: decimalToNumber(invoice.paidAmount),
            },
            after: {
              status: updatedInvoice.status,
              paidAmount: nextState.paidAmount,
              paidAt: updatedInvoice.paidAt?.toISOString() ?? null,
            },
            metadata: {
              source: "dashboard-payments-automation",
              total: decimalToNumber(invoice.total),
              paidPaymentsTotal,
            },
          },
        });
      }

      const payment = await tx.payment.findUnique({
        where: {
          id: createdPayment.id,
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          order: true,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
        automation: {
          previousStatus: invoice.status,
          nextStatus: updatedInvoice.status,
          paidAmount: nextState.paidAmount,
          total: decimalToNumber(invoice.total),
        },
      };
    });

    const paymentConfirmation =
      result.automation.nextStatus === "PAID"
        ? await sendPaymentConfirmationWorkflow(
            result.invoice.id,
          )
        : null;

    return NextResponse.json({
      layer: "dashboard-payments-api",
      message: "Payment created",
      data: {
        status: "success",
        message:
          paymentConfirmation?.actionRequired
            ? "Zahlung wurde gespeichert. Die Zahlungsbestätigung braucht Prüfung."
            : "Zahlung wurde gespeichert.",
        payment: result.payment,
        invoice: result.invoice,
        automation: result.automation,
        paymentConfirmation,
      },
    });
  } catch (error) {
    console.error("Payments POST error:", error);

    if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Invoice not found",
          data: {
            status: "error",
            message: "Rechnung für die Zahlung wurde nicht gefunden.",
            payment: null,
            invoice: null,
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "INVOICE_CANCELLED") {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Invoice cancelled",
          data: {
            status: "error",
            message:
              "Eine stornierte Rechnung kann keine Zahlungen erhalten.",
            payment: null,
            invoice: null,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        layer: "dashboard-payments-api",
        message: "Dashboard payment create failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown payments POST error",
          payment: null,
          invoice: null,
        },
      },
      { status: 500 },
    );
  }
}