import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

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

const paymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];
const paymentMethods = ["CASH", "BANK_TRANSFER", "TWINT", "CARD", "OTHER"];

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

  return (Math.round((parsed + Number.EPSILON) * 100) / 100).toFixed(2);
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

function cleanPaymentStatus(value: unknown) {
  const raw = String(value || "PAID").trim().toUpperCase();

  if (raw === "CANCELED") return "CANCELLED";

  return paymentStatuses.includes(raw) ? raw : "PAID";
}

function cleanPaymentMethod(value: unknown) {
  const raw = String(value || "BANK_TRANSFER").trim().toUpperCase();

  return paymentMethods.includes(raw) ? raw : "BANK_TRANSFER";
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

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "0").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
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
        message: "Płatności zostały pobrane.",
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
            error instanceof Error ? error.message : "Unknown payments GET error",
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
            message: "Nieprawidłowe dane płatności.",
            payment: null,
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
            message: "Wybierz fakturę dla płatności.",
            payment: null,
          },
        },
        { status: 400 },
      );
    }

    if (amount === null || toNumber(amount) <= 0) {
      return NextResponse.json(
        {
          layer: "dashboard-payments-api",
          message: "Invalid amount",
          data: {
            status: "error",
            message: "Wpisz poprawną kwotę płatności.",
            payment: null,
          },
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const payment = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      });

      if (!invoice) {
        throw new Error("Nie znaleziono faktury dla płatności.");
      }

      const paymentStatus = cleanPaymentStatus(body.status);
      const method = cleanPaymentMethod(body.method);
      const currency = cleanCurrency(invoice.currency);
      const paidAt =
        paymentStatus === "PAID" ? cleanDate(body.paidAt) ?? new Date() : null;

      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          amount,
          currency,
          status: paymentStatus as any,
          method: method as any,
          externalRef: cleanText(body.externalRef),
          notes: cleanText(body.notes),
          paidAt,
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

      if (paymentStatus === "PAID") {
        const currentPaid = toNumber(invoice.paidAmount);
        const invoiceTotal = toNumber(invoice.total);
        const paidValue = toNumber(amount);
        const nextPaidAmount = Math.max(currentPaid + paidValue, 0);
        const nextInvoiceStatus =
          invoiceTotal > 0 && nextPaidAmount >= invoiceTotal
            ? "PAID"
            : "PARTIALLY_PAID";

        await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            paidAmount: nextPaidAmount.toFixed(2),
            status: nextInvoiceStatus as any,
            paidAt:
              nextInvoiceStatus === "PAID"
                ? paidAt ?? new Date()
                : invoice.paidAt,
            currency,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          action: "CREATE",
          entityType: "Payment",
          entityId: createdPayment.id,
          actorType: "admin",
          message: `Payment ${createdPayment.amount.toString()} ${createdPayment.currency} created for invoice ${invoice.invoiceNumber}.`,
          after: {
            paymentId: createdPayment.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: createdPayment.amount.toString(),
            currency: createdPayment.currency,
            status: createdPayment.status,
            method: createdPayment.method,
          },
          metadata: {
            source: "dashboard-payments-api",
          },
        },
      });

      return createdPayment;
    });

    return NextResponse.json({
      layer: "dashboard-payments-api",
      message: "Payment created",
      data: {
        status: "success",
        message: "Płatność została zapisana.",
        payment,
      },
    });
  } catch (error) {
    console.error("Payments POST error:", error);

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
        },
      },
      { status: 500 },
    );
  }
}