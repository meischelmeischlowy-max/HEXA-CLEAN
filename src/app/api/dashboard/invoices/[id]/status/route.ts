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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    const body = await request.json();

    const action = typeof body.action === "string" ? body.action : "";
    const method = isPaymentMethod(body.method)
      ? body.method
      : "BANK_TRANSFER";

    if (!["mark_sent", "mark_paid", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "Unknown invoice status action." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id,
        },
      });

      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      if (action === "mark_sent") {
        if (invoice.status === "CANCELLED") {
          throw new Error("INVOICE_CANCELLED");
        }

        const updatedInvoice = await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
            sentAt: invoice.sentAt ?? new Date(),
          },
        });

        return {
          invoice: updatedInvoice,
          payment: null,
        };
      }

      if (action === "mark_paid") {
        if (invoice.status === "CANCELLED") {
          throw new Error("INVOICE_CANCELLED");
        }

        const total = roundMoney(decimalToNumber(invoice.total));
        const paidAmount = roundMoney(decimalToNumber(invoice.paidAmount));
        const openAmount = roundMoney(Math.max(total - paidAmount, 0));

        let payment = null;

        if (openAmount > 0) {
          payment = await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              orderId: invoice.orderId,
              amount: openAmount.toFixed(2),
              currency: invoice.currency || "CHF",
              status: "PAID",
              method,
              externalRef: null,
              notes: "Manuell als bezahlt markiert.",
              paidAt: new Date(),
            },
          });
        }

        const updatedInvoice = await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            paidAmount: total.toFixed(2),
            status: "PAID",
            paidAt: new Date(),
          },
        });

        return {
          invoice: updatedInvoice,
          payment,
        };
      }

      if (action === "cancel") {
        const paidAmount = roundMoney(decimalToNumber(invoice.paidAmount));

        if (paidAmount > 0) {
          throw new Error("INVOICE_HAS_PAYMENTS");
        }

        const updatedInvoice = await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        return {
          invoice: updatedInvoice,
          payment: null,
        };
      }

      throw new Error("UNKNOWN_ACTION");
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH invoice status error:", error);

    if (error instanceof Error && error.message === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "INVOICE_CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled invoice cannot be changed." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "INVOICE_HAS_PAYMENTS") {
      return NextResponse.json(
        { error: "Invoice with payments cannot be cancelled." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Could not update invoice status." },
      { status: 500 },
    );
  }
}