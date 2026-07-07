import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import AddInvoicePaymentForm from "../../../../components/dashboard/AddInvoicePaymentForm";

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

function paymentStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    PENDING: "Offen",
    PAID: "Bezahlt",
    FAILED: "Fehlgeschlagen",
    REFUNDED: "Zurückerstattet",
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
    return "—";
  }

  return labels[unit] ?? unit;
}

export default async function DashboardInvoiceDetailsPage({
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
      attachments: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  const currency = safeCurrency(invoice.currency);
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

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/dashboard/invoices"
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Zurück zu Rechnungen
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Rechnung
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                Rechnung für {customerName(invoice.customer)}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Status
              </p>
              <p className="mt-2 text-lg font-black text-cyan-100">
                {invoiceStatusLabel(invoice.status)}
              </p>
              <p className="mt-1 text-xs text-cyan-100/60">
                Wird durch echte Aktionen automatisch aktualisiert.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link
            href={`/documents/invoices/${invoice.id}/print`}
            className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20"
          >
            Rechnung öffnen
          </Link>

          <Link
            href={`/documents/invoices/${invoice.id}/print`}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20"
          >
            Drucken / PDF
          </Link>

          <Link
            href="/dashboard/invoices"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Rechnungsliste
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Kunde</p>
            <p className="mt-2 text-xl font-semibold">
              {customerName(invoice.customer)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {invoice.customer?.email ??
                invoice.customer?.phone ??
                "Kein Kontakt hinterlegt"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Rechnungsdatum</p>
            <p className="mt-2 text-xl font-semibold">
              {formatDate(invoice.issueDate)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Fällig bis: {formatDate(invoice.dueDate)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Bezahlt</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(invoice.paidAmount, currency)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Zahlungen: {invoice.payments.length}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-100/70">Offen</p>
            <p className="mt-2 text-xl font-black text-amber-100">
              {formatMoney(openAmount, currency)}
            </p>
            <p className="mt-1 text-sm text-amber-100/60">Noch zu bezahlen</p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300 p-5 text-neutral-950">
            <p className="text-sm font-semibold opacity-70">Total</p>
            <p className="mt-2 text-2xl font-black">
              {formatMoney(invoice.total, currency)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Kundendaten</h2>

            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">Name: </span>
                {customerName(invoice.customer)}
              </p>
              <p>
                <span className="text-neutral-500">Adressesese: </span>
                {customerAddress || "—"}
              </p>
              <p>
                <span className="text-neutral-500">E-Mail: </span>
                {invoice.customer?.email ?? "—"}
              </p>
              <p>
                <span className="text-neutral-500">Telefon: </span>
                {invoice.customer?.phone ?? "—"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Auftrag / Leistungsort</h2>

            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">Auftrag: </span>
                {invoice.orderId ? (
                  <Link
                    href={`/dashboard/orders/${invoice.orderId}`}
                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Auftrag öffnen
                  </Link>
                ) : (
                  "—"
                )}
              </p>
              <p>
                <span className="text-neutral-500">Leistungsort: </span>
                {serviceAddress || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Rechnungspositionen</h2>

          {invoice.items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Keine Positionen gespeichert. Diese Rechnung wurde wahrscheinlich
              vor dem Positionsmodul erstellt.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Leistung</th>
                    <th className="px-4 py-4">Einheit</th>
                    <th className="px-4 py-4 text-right">Menge</th>
                    <th className="px-4 py-4 text-right">Preis</th>
                    <th className="px-4 py-4 text-right">Betrag</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-neutral-100">
                          {item.name}
                        </p>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-5 text-neutral-500">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {invoiceUnitLabel(item.unit)}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-300">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="px-4 py-4 text-right text-neutral-300">
                        {formatMoney(item.unitPrice, currency)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-neutral-100">
                        {formatMoney(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Rechnungsübersicht</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Zwischensumme</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.subtotal, currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">MWST</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.taxAmount, currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Total</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.total, currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Bezahlt</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.paidAmount, currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <p className="text-sm text-cyan-100/70">Offen</p>
              <p className="mt-2 text-xl font-black text-cyan-100">
                {formatMoney(openAmount, currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Notiz
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {invoice.notes ?? "—"}
            </p>
          </div>
        </section>

        <AddInvoicePaymentForm
          invoiceId={invoice.id}
          openAmount={openAmount}
          currency={currency}
        />

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Zahlungen</h2>

          {invoice.payments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Für diese Rechnung wurden noch keine Zahlungen erfasst.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Datum</th>
                    <th className="px-4 py-4">Methode</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Betrag</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-4 text-neutral-300">
                        {formatDate(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {paymentMethodLabel(payment.method)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {paymentStatusLabel(payment.status)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(payment.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Anhänge</h2>
            <p className="mt-2 text-3xl font-black">
              {invoice.attachments.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Später: PDF-Dateien, Fotos und Zahlungsbestätigungen.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">PDF</h2>
            <p className="mt-2 text-sm text-neutral-400">
              {invoice.pdfUrl ?? "PDF wurde noch nicht als Datei gespeichert."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Automatisierung</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Der Status soll aus echten Aktionen entstehen: Rechnung senden,
              Zahlung erfassen, Fälligkeit prüfen oder Rechnung stornieren.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}