import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function normalizeCurrency(value: string | null | undefined) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;

  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function formatMoney(value: unknown, currency: string | null | undefined = "CHF") {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(Number.isFinite(number) ? number : 0);
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
      return "Robocza";
    case "SENT":
      return "Wysłana";
    case "PAID":
      return "Opłacona";
    case "PARTIALLY_PAID":
      return "Częściowo opłacona";
    case "OVERDUE":
      return "Po terminie";
    case "CANCELLED":
      return "Anulowana";
    default:
      return status || "Brak statusu";
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

  return fullName || "Brak klienta";
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
    const total = Number(invoice.total ?? 0);
    const paid = Number(invoice.paidAmount ?? 0);

    return sum + Math.max(total - paid, 0);
  }, 0);

  const totalPaid = invoices.reduce((sum, invoice) => {
    return sum + Number(invoice.paidAmount ?? 0);
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
                Faktury
              </p>

              <h1 className="mt-2 text-3xl font-bold text-white">Lista faktur</h1>

              <p className="mt-2 text-sm text-slate-400">
                Przegląd faktur, płatności, zaległości i szybkich akcji.
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
                Wyceny
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Liczba faktur</p>
            <p className="mt-2 text-3xl font-bold text-white">{invoices.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Zapłacono razem</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {formatMoney(totalPaid, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Pozostało do zapłaty</p>
            <p className="mt-2 text-3xl font-bold text-rose-300">
              {formatMoney(totalOpen, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Opłacone / po terminie</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {paidCount} / {overdueCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Faktury</h2>
              <p className="mt-1 text-sm text-slate-400">
                Kliknij szczegóły, żeby wpisać wpłatę albo zmienić status.
              </p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
              <p className="text-sm text-slate-400">Brak faktur.</p>
              <p className="mt-2 text-xs text-slate-500">
                Faktury powstaną po utworzeniu ich z zaakceptowanej wyceny.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Faktura</th>
                    <th className="px-4 py-4">Klient</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Total</th>
                    <th className="px-4 py-4 text-right">Zapłacono</th>
                    <th className="px-4 py-4 text-right">Pozostało</th>
                    <th className="px-4 py-4">Termin</th>
                    <th className="px-4 py-4 text-right">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {invoices.map((invoice) => {
                    const currency = normalizeCurrency(invoice.currency);
                    const total = Number(invoice.total ?? 0);
                    const paid = Number(invoice.paidAmount ?? 0);
                    const remaining = Math.max(total - paid, 0);

                    return (
                      <tr key={invoice.id} className="bg-slate-900/40 hover:bg-slate-800/60">
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-white">
                            {invoice.invoiceNumber || invoice.id}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Data: {formatDate(invoice.issueDate)}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-slate-100">
                            {customerName(invoice.customer)}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {invoice.customer.email || "Brak e-maila"}
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
                              Szczegóły
                            </Link>

                            <Link
                              href={`/dashboard/invoices/${invoice.id}/edit`}
                              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                            >
                              Edytuj
                            </Link>

                            <Link
                              href={`/dashboard/invoices/${invoice.id}/print`}
                              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                            >
                              Drukuj
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