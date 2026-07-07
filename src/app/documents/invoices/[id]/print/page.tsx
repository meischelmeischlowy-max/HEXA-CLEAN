import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimateOfferPrintButton from "../../../../../components/dashboard/EstimateOfferPrintButton";
import { companyConfig } from "../../../../../config/company";

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

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value.trim().replace(",", "."));
    return Number.isFinite(number) ? number : 0;
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

  return 0;
}

function safeCurrency(value: unknown) {
  if (typeof value !== "string") {
    return "CHF";
  }

  const cleaned = value.trim().toUpperCase();

  if (cleaned === "CHF" || cleaned === "EUR" || cleaned === "USD") {
    return cleaned;
  }

  return "CHF";
}

function formatMoney(value: unknown, currencyInput: unknown = "CHF") {
  const currency = safeCurrency(currencyInput);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(decimalToNumber(value));
}

function formatQuantity(value: unknown) {
  const number = decimalToNumber(value);

  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.toLocaleDateString("de-CH", {
    dateStyle: "medium",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
}

function invoiceStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    SENT: "Gesendet",
    PARTIALLY_PAID: "Teilweise bezahlt",
    PAID: "Bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function paymentMethodLabel(method: string | null | undefined) {
  const labels: Record<string, string> = {
    CASH: "Barzahlung",
    BANK_TRANSFER: "Banküberweisung",
    TWINT: "TWINT",
    CARD: "Karte",
    OTHER: "Andere",
  };

  if (!method) {
    return "—";
  }

  return labels[method] ?? method;
}

function invoiceUnitLabel(unit: string | null | undefined) {
  const labels: Record<string, string> = {
    FLAT: "Pauschal",
    HOUR: "Std.",
    M2: "m²",
    ROOM: "Raum",
    WINDOW: "Fenster",
    PIECE: "Stk.",
    KM: "km",
    CUSTOM: "Individuell",
  };

  if (!unit) {
    return "Pauschal";
  }

  return labels[unit] ?? unit;
}

function companyAddressLines() {
  return [
    companyConfig.legalName,
    companyConfig.street,
    [companyConfig.zipCode, companyConfig.city].filter(Boolean).join(" "),
    companyConfig.country,
  ].filter(Boolean);
}

function customerAddressLines(customer: {
  street: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
}) {
  return [
    customer.street,
    [customer.zipCode, customer.city].filter(Boolean).join(" "),
    customer.country,
  ].filter(Boolean);
}

function cleanItemName(value: string | null | undefined) {
  if (!value) {
    return companyConfig.invoice.defaultServiceText;
  }

  const text = value.trim();

  if (!text) {
    return companyConfig.invoice.defaultServiceText;
  }

  const lower = text.toLowerCase();

  if (
    lower.includes("invoice generated") ||
    lower.includes("estimate id") ||
    lower.includes("customer notes") ||
    lower.includes("unknown")
  ) {
    return companyConfig.invoice.defaultServiceText;
  }

  return text;
}

function printMetaLine(label: string, value: string) {
  return (
    <div className="flex justify-between gap-6 border-b border-neutral-200 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

export default async function DocumentsInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      order: true,
      quote: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const currency = safeCurrency(invoice.currency);
  const total = decimalToNumber(invoice.total);
  const taxAmount = decimalToNumber(invoice.taxAmount);
  const paidAmount = decimalToNumber(invoice.paidAmount);
  const openAmount = Math.max(total - paidAmount, 0);
  const hasMwst = companyConfig.mwst.registered || taxAmount > 0;

  const serviceDate = invoice.order?.scheduledStart ?? invoice.issueDate;
  const customerLines = customerAddressLines(invoice.customer);

  const serviceAddress = invoice.order
    ? [
        invoice.order.serviceStreet,
        [invoice.order.serviceZipCode, invoice.order.serviceCity]
          .filter(Boolean)
          .join(" "),
        invoice.order.serviceCountry,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const invoiceRows =
    invoice.items.length > 0
      ? invoice.items.map((item) => ({
          id: item.id,
          name: cleanItemName(item.name),
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.total,
        }))
      : [
          {
            id: "fallback",
            name: companyConfig.invoice.defaultServiceText,
            description: null,
            quantity: "1.00",
            unit: "FLAT",
            unitPrice: invoice.subtotal,
            total: invoice.subtotal,
          },
        ];

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            ← Zurück zur Rechnung
          </Link>

          <EstimateOfferPrintButton />
        </div>

        <article className="rounded-3xl bg-white p-8 shadow-2xl shadow-neutral-400/40 print:rounded-none print:p-10 print:shadow-none">
          <header className="flex flex-col gap-8 border-b border-neutral-200 pb-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50">
                <span className="text-4xl font-black text-cyan-600">H</span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                {companyConfig.name}
              </h1>

              <div className="mt-3 space-y-1 text-sm leading-6 text-neutral-600">
                {companyAddressLines().map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}

                {companyConfig.email ? <p>{companyConfig.email}</p> : null}
                {companyConfig.phone ? <p>{companyConfig.phone}</p> : null}
                {companyConfig.website ? <p>{companyConfig.website}</p> : null}

                {companyConfig.mwst.registered && companyConfig.mwst.uid ? (
                  <p>MWST-Nr.: {companyConfig.mwst.uid}</p>
                ) : null}
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Rechnung
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {invoice.invoiceNumber}
              </h2>

              <div className="mt-4 space-y-1 text-sm text-neutral-500">
                <p>Rechnungsdatum: {formatDate(invoice.issueDate)}</p>
                <p>Leistungsdatum: {formatDate(serviceDate)}</p>
                <p>Fällig bis: {formatDate(invoice.dueDate)}</p>
                <p>Status: {invoiceStatusLabel(invoice.status)}</p>
              </div>
            </div>
          </header>

          <section className="grid gap-6 border-b border-neutral-200 py-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Rechnung an
              </p>

              <p className="mt-3 text-xl font-bold">
                {customerName(invoice.customer)}
              </p>

              <div className="mt-2 space-y-1 text-sm leading-6 text-neutral-600">
                {customerLines.length > 0 ? (
                  customerLines.map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))
                ) : (
                  <p>Keine Kundenadresse angegeben</p>
                )}

                {invoice.customer?.email ? <p>E-Mail: {invoice.customer.email}</p> : null}
                {invoice.customer?.phone ? <p>Telefon: {invoice.customer.phone}</p> : null}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Leistungsort
              </p>

              <p className="mt-3 text-xl font-bold">
                {invoice.order?.serviceCity ?? invoice.customer?.city ?? "—"}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {serviceAddress || customerLines.join(", ") || "Kein Leistungsort angegeben"}
              </p>
            </div>
          </section>

          <section className="grid gap-6 border-b border-neutral-200 py-8 md:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Leistungsbeschreibung
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {companyConfig.invoice.defaultServiceText}
              </h2>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Die Rechnung basiert auf den erfassten Leistungen, der zugehörigen
                Offerte/Kalkulation und den im System gespeicherten Zahlungsdaten.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Rechnungsdaten
              </p>

              <div className="mt-3">
                {printMetaLine("Rechnungsnummer", invoice.invoiceNumber)}
                {printMetaLine("Status", invoiceStatusLabel(invoice.status))}
                {printMetaLine("Währung", currency)}
                {printMetaLine("Fällig bis", formatDate(invoice.dueDate))}
                {invoice.quote?.quoteNumber
                  ? printMetaLine("Angebot", invoice.quote.quoteNumber)
                  : null}
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-4">Leistung</th>
                    <th className="px-4 py-4 text-right">Menge</th>
                    <th className="px-4 py-4 text-right">Einheit</th>
                    <th className="px-4 py-4 text-right">Einzelpreis</th>
                    <th className="px-4 py-4 text-right">Betrag</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-200">
                  {invoiceRows.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold">{item.name}</p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-5 text-neutral-500">
                            {item.description}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-neutral-600">
                        {formatQuantity(item.quantity)}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-neutral-600">
                        {invoiceUnitLabel(item.unit)}
                      </td>

                      <td className="px-4 py-4 text-right align-top text-neutral-600">
                        {formatMoney(item.unitPrice, currency)}
                      </td>

                      <td className="px-4 py-4 text-right align-top font-bold">
                        {formatMoney(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 border-t border-neutral-200 pt-8 md:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Zahlungshinweis
              </p>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {companyConfig.invoice.defaultPaymentText}
              </p>

              {companyConfig.iban ? (
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-6 text-neutral-600">
                  <p>Empfänger: {companyConfig.paymentRecipient}</p>
                  <p>IBAN: {companyConfig.iban}</p>
                  {companyConfig.bankName ? <p>Bank: {companyConfig.bankName}</p> : null}
                </div>
              ) : null}

              {!hasMwst ? (
                <p className="mt-5 text-sm leading-6 text-neutral-600">
                  {companyConfig.mwst.notRegisteredText}
                </p>
              ) : null}

              {invoice.payments.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm font-bold text-neutral-900">
                    Erfasste Zahlungen
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-neutral-600">
                    {invoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between gap-4 border-b border-neutral-200 pb-2 last:border-b-0 last:pb-0"
                      >
                        <span>
                          {formatDate(payment.paidAt ?? payment.createdAt)} ·{" "}
                          {paymentMethodLabel(payment.method)}
                        </span>
                        <span className="font-semibold">
                          {formatMoney(payment.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="mt-5 text-xs leading-5 text-neutral-400">
                {companyConfig.invoice.footerText}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
                <span className="text-neutral-500">
                  {hasMwst ? "Zwischensumme exkl. MWST" : "Zwischensumme"}
                </span>
                <span className="font-semibold">
                  {formatMoney(invoice.subtotal, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">MWST</span>
                <span className="font-semibold">
                  {hasMwst
                    ? formatMoney(invoice.taxAmount, currency)
                    : "Keine MWST ausgewiesen"}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Total</span>
                <span className="font-semibold">
                  {formatMoney(invoice.total, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Bereits bezahlt</span>
                <span className="font-semibold">
                  - {formatMoney(invoice.paidAmount, currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 pt-5">
                <span className="text-lg font-black">Offener Betrag</span>
                <span className="text-2xl font-black text-cyan-700">
                  {formatMoney(openAmount, currency)}
                </span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs leading-5 text-neutral-400">
            {companyConfig.name} · Rechnung · {invoice.invoiceNumber} · Erstellt
            mit HEXA OS CRM · {formatDate(new Date())}
          </footer>
        </article>
      </div>
    </main>
  );
}