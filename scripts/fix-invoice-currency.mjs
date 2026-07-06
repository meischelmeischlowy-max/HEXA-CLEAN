import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { Pool } = pg;

const VALID_CURRENCIES = new Set(["CHF", "EUR", "USD"]);
const SHOULD_WRITE = process.argv.includes("--write");

function normalizeCurrency(value) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (VALID_CURRENCIES.has(raw)) {
    return raw;
  }

  if (raw.startsWith("CHF")) {
    return "CHF";
  }

  if (raw.startsWith("EUR")) {
    return "EUR";
  }

  if (raw.startsWith("USD")) {
    return "USD";
  }

  return "CHF";
}

function isInvalidCurrency(value) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return !VALID_CURRENCIES.has(raw);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Brak DATABASE_URL w .env");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("HEXA CLEAN - invoice/payment currency check");
    console.log(SHOULD_WRITE ? "TRYB: NAPRAWA (--write)" : "TRYB: TYLKO PODGLAD");
    console.log("");

    const invoices = await prisma.invoice.findMany({
      select: {
        id: true,
        currency: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const payments = await prisma.payment.findMany({
      select: {
        id: true,
        invoiceId: true,
        currency: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const invalidInvoices = invoices.filter((invoice) =>
      isInvalidCurrency(invoice.currency)
    );

    const invalidPayments = payments.filter((payment) =>
      isInvalidCurrency(payment.currency)
    );

    console.log(`Faktury razem: ${invoices.length}`);
    console.log(`Faktury z bledna waluta: ${invalidInvoices.length}`);
    console.log("");

    for (const invoice of invalidInvoices) {
      const nextCurrency = normalizeCurrency(invoice.currency);

      console.log(
        `Invoice ${invoice.id}: "${invoice.currency}" -> "${nextCurrency}"`
      );

      if (SHOULD_WRITE) {
        await prisma.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            currency: nextCurrency,
          },
        });
      }
    }

    console.log("");
    console.log(`Platnosci razem: ${payments.length}`);
    console.log(`Platnosci z bledna waluta: ${invalidPayments.length}`);
    console.log("");

    for (const payment of invalidPayments) {
      const nextCurrency = normalizeCurrency(payment.currency);

      console.log(
        `Payment ${payment.id}: "${payment.currency}" -> "${nextCurrency}"`
      );

      if (SHOULD_WRITE) {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            currency: nextCurrency,
          },
        });
      }
    }

    console.log("");
    console.log(
      SHOULD_WRITE
        ? "Gotowe. Bledne waluty zostaly poprawione."
        : "Gotowe. To byl tylko podglad. Aby naprawic dane, uruchom z --write."
    );

    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error("");
    console.error("BLAD:");
    console.error(error);
    process.exitCode = 1;
  }
}

main();