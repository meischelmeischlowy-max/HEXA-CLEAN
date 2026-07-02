import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimateOfferPrintButton from "../../../../../components/dashboard/EstimateOfferPrintButton";

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

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
    });
  }

  return globalForPrisma.hexaPrisma;
}

function formatMoney(value: unknown, currency = "CHF") {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("de-CH", {
    dateStyle: "medium",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
} | null) {
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "—";
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    SENT: "Gesendet",
    PAID: "Bezahlt",
    PARTIALLY_PAID: "Teilweise bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
    CANCELED: "Storniert",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function getPublicNotes(notes: string | null | undefined) {
  if (!notes) {
    return "Vielen Dank für Ihren Auftrag. Bitte begleichen Sie den Rechnungsbetrag bis zum angegebenen Zahlungsziel.";
  }

  const cleanedLines = notes
    .split("\n")
    .map((line) =>
      line
        .replace("Customer notes:", "")
        .replace("Invoice generated from estimate", "Rechnung erstellt aus Angebot")
        .trim()
    )
    .filter(Boolean)
    .filter((line) => !line.startsWith("Estimate ID:"))
    .filter((line) => !line.toLowerCase().includes("estimate id"));

  if (cleanedLines.length === 0) {
    return "Vielen Dank für Ihren Auftrag. Bitte begleichen Sie den Rechnungsbetrag bis zum angegebenen Zahlungsziel.";
  }

  return cleanedLines.join(" ");
}

export default async function DashboardInvoicePrintPage({
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
    },
  });

  if (!invoice) {
    notFound();
  }

  const customerAddress = [
    invoice.customer?.street,
    [invoice.customer?.zipCode, invoice.customer?.city].filter(Boolean).join(" "),
    invoice.customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const outstandingNumber =
    Number(invoice.total?.toString() ?? 0) -
    Number(invoice.paidAmount?.toString() ?? 0);

  const outstandingAmount = Math.max(
    Number.isFinite(outstandingNumber) ? outstandingNumber : 0,
    0
  );

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            ← Wróć do szczegółów
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
{invoice.invoiceNumber ?? invoice.id}
              </h2>

              <p className="mt-3 text-sm text-neutral-500">
                Rechnungsdatum: {formatDate(invoice.issueDate ?? invoice.createdAt)}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Zahlungsfrist: {formatDate(invoice.dueDate)}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Status: {statusLabel(invoice.status)}
              </p>
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
                Zahlungsinformationen
              </p>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Währung: {invoice.currency ?? "CHF"}
                <br />
                Fälliger Betrag:{" "}
                <span className="font-bold text-neutral-950">
                  {formatMoney(outstandingAmount, invoice.currency ?? "CHF")}
                </span>
                <br />
                Zahlungsziel: {formatDate(invoice.dueDate)}
              </p>
            </div>
          </section>

          <section className="border-b border-neutral-200 py-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              Leistungsbeschreibung
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Reinigungsdienstleistungen
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {getPublicNotes(invoice.notes)}
            </p>
          </section>

          <section className="py-8">
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-4">Position</th>
                    <th className="px-4 py-4">Menge</th>
                    <th className="px-4 py-4">Preis</th>
                    <th className="px-4 py-4 text-right">Gesamt</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td className="px-4 py-4 align-top">
                      <p className="font-bold">Reinigungsdienstleistungen</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Gemäß vereinbartem Leistungsumfang.
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-neutral-700">
                      1 Pauschal
                    </td>

                    <td className="px-4 py-4 align-top text-neutral-700">
                      {formatMoney(invoice.subtotal, invoice.currency ?? "CHF")}
                    </td>

                    <td className="px-4 py-4 text-right align-top font-bold">
                      {formatMoney(invoice.subtotal, invoice.currency ?? "CHF")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 border-t border-neutral-200 pt-8 md:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Hinweis
              </p>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Dieses Dokument ist eine Rechnung. Bitte prüfen Sie die Angaben
                und begleichen Sie den offenen Betrag innerhalb der angegebenen
                Zahlungsfrist.
              </p>

              <p className="mt-5 text-xs leading-5 text-neutral-400">
                Diese Rechnung wurde mit HEXA OS CRM erstellt.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
                <span className="text-neutral-500">Zwischensumme</span>
                <span className="font-semibold">
                  {formatMoney(invoice.subtotal, invoice.currency ?? "CHF")}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">MwSt.</span>
                <span className="font-semibold">
                  {formatMoney(invoice.taxAmount, invoice.currency ?? "CHF")}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Bereits bezahlt</span>
                <span className="font-semibold">
                  - {formatMoney(invoice.paidAmount, invoice.currency ?? "CHF")}
                </span>
              </div>

              <div className="flex justify-between gap-4 pt-5">
                <span className="text-lg font-black">Offener Betrag</span>
                <span className="text-2xl font-black text-cyan-700">
                  {formatMoney(outstandingAmount, invoice.currency ?? "CHF")}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4 text-sm text-neutral-500">
                <span>Gesamtbetrag</span>
                <span>{formatMoney(invoice.total, invoice.currency ?? "CHF")}</span>
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