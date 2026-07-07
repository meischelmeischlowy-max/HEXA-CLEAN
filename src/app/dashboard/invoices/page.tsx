import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value.replace(",", "."));
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

function normalizeCurrency(value: string | null | undefined) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (raw === "CHF" || raw.startsWith("CHF")) return "CHF";
  if (raw === "EUR" || raw.startsWith("EUR")) return "EUR";
  if (raw === "USD" || raw.startsWith("USD")) return "USD";

  return "CHF";
}

function formatMoney(value: unknown, currency: string | null | undefined = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(decimalToNumber(value));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case "DRAFT":
      return "Entwurf";
    case "SENT":
      return "Gesendet";
    case "PAID":
      return "Bezahlt";
    case "PARTIALLY_PAID":
      return "Teilweise bezahlt";
    case "OVERDUE":
      return "Überfällig";
    case "CANCELLED":
      return "Storniert";
    default:
      return status || "Kein Status";
  }
}

function statusClass(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
    case "PARTIALLY_PAID":
      return "border-amber-400/40 bg-amber-400/10 text-amber-200";
    case "OVERDUE":
      return "border-rose-400/40 bg-rose-400/10 text-rose-200";
    case "SENT":
      return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200";
    case "CANCELLED":
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
    default:
      return "border-slate-600 bg-slate-800 text-slate-300";
  }
}

function customerName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || "Kein Kunde";
}

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customer: true,
    },
  });

  const totalOpen = invoices.reduce((sum, invoice) => {
    const total = decimalToNumber(invoice.total);
    const paid = decimalToNumber(invoice.paidAmount);

    return sum + Math.max(total - paid, 0);
  }, 0);

  const totalPaid = invoices.reduce((sum, invoice) => {
    return sum + decimalToNumber(invoice.paidAmount);
  }, 0);

  const overdueCount = invoices.filter((invoice) => invoice.status === "OVERDUE").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "PAID").length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
                Rechnungen
              </p>

              <h1 className="mt-2 text-3xl font-bold text-white">
                Rechnungsliste
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Übersicht über Rechnungen, offene Beträge und erfasste Zahlungen.
                Der Status wird durch echte Aktionen automatisch aktualisiert.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Dashboard
              </Link>

              <Link
                href="/dashboard/estimates"
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Angebote
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Rechnungen</p>
            <p className="mt-2 text-3xl font-bold text-white">{invoices.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Bezahlt</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {formatMoney(totalPaid, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Offen</p>
            <p className="mt-2 text-3xl font-bold text-rose-300">
              {formatMoney(totalOpen, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Bezahlt / Überfällig</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {paidCount} / {overdueCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Rechnungen</h2>
              <p className="mt-1 text-sm text-slate-400">
                Öffnen Sie eine Rechnung, um Details zu prüfen, Zahlungen zu
                erfassen oder das PDF zu drucken.
              </p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
              <p className="text-sm text-slate-400">Keine Rechnungen vorhanden.</p>
              <p className="mt-2 text-xs text-slate-500">
                Rechnungen entstehen aus Angeboten oder werden später manuell erfasst.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Rechnung</th>
                    <th className="px-4 py-4">Kunde</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Total</th>
                    <th className="px-4 py-4 text-right">Bezahlt</th>
                    <th className="px-4 py-4 text-right">Offen</th>
                    <th className="px-4 py-4">Fällig bis</th>
                    <th className="px-4 py-4 text-right">Aktionen</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {invoices.map((invoice) => {
                    const currency = normalizeCurrency(invoice.currency);
                    const total = decimalToNumber(invoice.total);
                    const paid = decimalToNumber(invoice.paidAmount);
                    const remaining = Math.max(total - paid, 0);

                    return (
                      <tr
                        key={invoice.id}
                        className="bg-slate-900/40 hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-white">
                            {invoice.invoiceNumber || invoice.id}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Datum: {formatDate(invoice.issueDate)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-slate-100">
                            {customerName(invoice.customer)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {invoice.customer.email || "Keine E-Mail"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                              invoice.status,
                            )}`}
                          >
                            {statusLabel(invoice.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right align-top font-semibold text-white">
                          {formatMoney(total, currency)}
                        </td>

                        <td className="px-4 py-4 text-right align-top font-semibold text-emerald-300">
                          {formatMoney(paid, currency)}
                        </td>

                        <td className="px-4 py-4 text-right align-top font-semibold text-rose-300">
                          {formatMoney(remaining, currency)}
                        </td>

                        <td className="px-4 py-4 align-top text-slate-300">
                          {formatDate(invoice.dueDate)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                            >
                              Öffnen
                            </Link>

                            <Link
                              href={`/dashboard/invoices/${invoice.id}/edit`}
                              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                            >
                              Bearbeiten
                            </Link>

                            <Link
                              href={`/documents/invoices/${invoice.id}/print`}
                              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                            >
                              PDF
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}