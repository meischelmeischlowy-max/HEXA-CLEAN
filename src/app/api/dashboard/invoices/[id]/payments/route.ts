import { NextResponse } from "next/server";
import {
  sendPaymentConfirmationWorkflow,
} from "@/lib/payment-confirmation-service";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "TWINT",
  "CARD",
  "OTHER",
] as const;

type PaymentMethodInput = (typeof PAYMENT_METHODS)[number];

function isPaymentMethod(value: unknown): value is PaymentMethodInput {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethodInput)
  );
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
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
            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        })
      : invoice;

    return NextResponse.json({
      invoiceId: invoiceForResponse.id,
      status: invoiceForResponse.status,
      total: invoiceForResponse.total,
      paidAmount: invoiceForResponse.paidAmount,
      dueDate: invoiceForResponse.dueDate,
      sentAt: invoiceForResponse.sentAt,
      paidAt: invoiceForResponse.paidAt,
      payments: invoiceForResponse.payments,
    });
  } catch (error) {
    console.error("GET invoice payments error:", error);

    return NextResponse.json(
      { error: "Could not load payments." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    const body = await request.json();

    const amount = roundMoney(decimalToNumber(body.amount));
    const method = isPaymentMethod(body.method)
      ? body.method
      : "BANK_TRANSFER";

    const externalRef = normalizeNullableText(body.externalRef);
    const notes = normalizeNullableText(body.notes);

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id,
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

      const invoiceCurrency = normalizeInvoiceCurrency(invoice.currency);

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          amount: amount.toFixed(2),
          currency: invoiceCurrency,
          status: "PAID",
          method,
          externalRef,
          notes,
          paidAt: new Date(),
        },
      });

      const paidPaymentsTotal = roundMoney(
        calculatePaidPaymentsTotal(invoice.payments) + amount,
      );

      const nextState = calculateAutomatedInvoiceState({
        currentStatus: invoice.status,
        total: invoice.total,
        paidPaymentsTotal,
        dueDate: invoice.dueDate,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
      });

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          paidAmount: moneyString(nextState.paidAmount),
          status: nextState.status,
          paidAt: nextState.paidAt,
          currency: invoiceCurrency,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          action: "CREATE",
          entityType: "Payment",
          entityId: payment.id,
          actorType: "system",
          message: `Payment ${payment.amount} ${payment.currency} registered for invoice ${invoice.invoiceNumber}.`,
          after: {
            paymentId: payment.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: amount.toFixed(2),
            currency: invoiceCurrency,
            method,
            status: payment.status,
          },
          metadata: {
            source: "invoice-payment-api",
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
              paidAt: updatedInvoice.paidAt,
            },
            metadata: {
              source: "invoice-payment-automation",
              total: decimalToNumber(invoice.total),
              paidPaymentsTotal,
            },
          },
        });
      }

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

    return NextResponse.json(
      {
        ...result,
        paymentConfirmation,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST invoice payment error:", error);

    if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "INVOICE_CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled invoice cannot receive payments." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Could not add payment." },
      { status: 500 },
    );
  }
}