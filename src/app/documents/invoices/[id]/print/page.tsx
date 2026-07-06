import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimateOfferPrintButton from "../../../../../components/dashboard/EstimateOfferPrintButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_INVOICE_NOTE =
  "Leistungsumfang gemäss vereinbartem Angebot. Diese Rechnung wurde mit HEXA OS CRM erstellt.";

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

function formatMoney(value: unknown, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(decimalToNumber(value));
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

function hasPolishText(value: string) {
  const lower = value.toLowerCase();

  const polishMarkers = [
    "cena",
    "orientacyjna",
    "ostateczna",
    "wycena",
    "faktura",
    "klienta",
    "zakresu",
    "sprzątanie",
    "sprzatanie",
    "mieszkania",
    "oddanie",
    "mycie",
    "okien",
    "dojazd",
    "małe",
    "male",
    "naprawy",
    "czyszczenie",
    "po potwierdzeniu",
    "utworzona",
    "ręcznie",
    "recznie",
    "panelu",
  ];

  return (
    /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(value) ||
    polishMarkers.some((marker) => lower.includes(marker))
  );
}

function germanText(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed || hasPolishText(trimmed)) {
    return fallback;
  }

  return trimmed;
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

  const total = decimalToNumber(invoice.total);
  const paidAmount = decimalToNumber(invoice.paidAmount);
  const openAmount = Math.max(total - paidAmount, 0);

  const customerAddress = [
    invoice.customer?.street,
    [invoice.customer?.zipCode, invoice.customer?.city].filter(Boolean).join(" "),
    invoice.customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

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

  const invoiceNote = germanText(invoice.notes, DEFAULT_INVOICE_NOTE);

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            ← Zurück zu den Details
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
                HEXA CLEAN
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Rechnung für Reinigungsdienstleistungen.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Rechnung
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {invoice.invoiceNumber}
              </h2>

              <p className="mt-3 text-sm text-neutral-500">
                Rechnungsdatum: {formatDate(invoice.issueDate)}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Fällig bis: {formatDate(invoice.dueDate)}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Status: {invoiceStatusLabel(invoice.status)}
              </p>
            </div>
          </header>

          <section className="grid gap-6 border-b border-neutral-200 py-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Kunde
              </p>

              <p className="mt-3 text-xl font-bold">
                {customerName(invoice.customer)}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {invoice.customer?.email ? (
                  <>
                    E-Mail: {invoice.customer.email}
                    <br />
                  </>
                ) : null}
                {invoice.customer?.phone ? (
                  <>
                    Telefon: {invoice.customer.phone}
                    <br />
                  </>
                ) : null}
                {customerAddress || "Keine Kundenadresse angegeben"}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Leistungsort
              </p>

              <p className="mt-3 text-xl font-bold">
                {invoice.order?.serviceCity ?? invoice.customer?.city ?? "—"}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {serviceAddress || customerAddress || "Kein Leistungsort angegeben"}
              </p>
            </div>
          </section>

          <section className="py-8">
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-4">Position</th>
                    <th className="px-4 py-4">Beschreibung</th>
                    <th className="px-4 py-4 text-right">Betrag</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-200">
                  <tr>
                    <td className="px-4 py-4 align-top">
                      <p className="font-bold">Reinigungsdienstleistungen</p>
                    </td>

                    <td className="px-4 py-4 align-top text-neutral-600">
                      {invoiceNote}
                    </td>

                    <td className="px-4 py-4 text-right align-top font-bold">
                      {formatMoney(invoice.subtotal, invoice.currency)}
                    </td>
                  </tr>
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
                Bitte begleichen Sie den offenen Betrag bis zum angegebenen
                Fälligkeitsdatum. Zahlungsinformationen werden separat oder auf
                Anfrage mitgeteilt.
              </p>

              <p className="mt-5 text-xs leading-5 text-neutral-400">
                Dieses Dokument wurde mit HEXA OS CRM erstellt.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
                <span className="text-neutral-500">Zwischensumme</span>
                <span className="font-semibold">
                  {formatMoney(invoice.subtotal, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">MwSt.</span>
                <span className="font-semibold">
                  {formatMoney(invoice.taxAmount, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Bereits bezahlt</span>
                <span className="font-semibold">
                  - {formatMoney(invoice.paidAmount, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 pt-5">
                <span className="text-lg font-black">Offener Betrag</span>
                <span className="text-2xl font-black text-cyan-700">
                  {formatMoney(openAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs leading-5 text-neutral-400">
            HEXA CLEAN · Rechnung · Erstellt mit HEXA OS CRM ·{" "}
            {formatDate(new Date())}
          </footer>
        </article>
      </div>
    </main>
  );
}