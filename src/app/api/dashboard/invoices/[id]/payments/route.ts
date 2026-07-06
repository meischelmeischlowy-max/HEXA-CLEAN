import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const number = Number(value.toString());
    return Number.isFinite(number) ? number : 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPaymentMethod(value: unknown): value is PaymentMethodInput {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethodInput)
  );
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

    return NextResponse.json({
      invoiceId: invoice.id,
      status: invoice.status,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      payments: invoice.payments,
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

    const externalRef =
      typeof body.externalRef === "string" && body.externalRef.trim()
        ? body.externalRef.trim()
        : null;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

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

      const previousPaidAmount = invoice.payments
        .filter((item) => item.status === "PAID")
        .reduce((sum, item) => sum + decimalToNumber(item.amount), 0);

      const nextPaidAmount = roundMoney(previousPaidAmount + amount);
      const invoiceTotal = roundMoney(decimalToNumber(invoice.total));

      const nextStatus =
        nextPaidAmount >= invoiceTotal ? "PAID" : "PARTIALLY_PAID";

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          paidAmount: nextPaidAmount.toFixed(2),
          status: nextStatus,
          paidAt: nextStatus === "PAID" ? new Date() : invoice.paidAt,
          currency: invoiceCurrency,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
      };
    });

    return NextResponse.json(result, { status: 201 });
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