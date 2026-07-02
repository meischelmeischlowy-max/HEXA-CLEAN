import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import InvoicePaymentRecorder from "@/components/dashboard/InvoicePaymentRecorder";
import InvoiceStatusQuickActions from "@/components/dashboard/InvoiceStatusQuickActions";

export const dynamic = "force-dynamic";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type PageProps = {
  params: Promise<{ id: string }>;
};

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

function customerName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || "Brak klienta";
}

function customerAddress(customer: {
  street?: string | null;
  postalCode?: string | null;
  postCode?: string | null;
  zipCode?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const zipValue =
    customer.postalCode || customer.postCode || customer.zipCode || customer.zip || null;

  const line = [customer.street, zipValue, customer.city, customer.country]
    .filter(Boolean)
    .join(", ");

  return line || "—";
}

export default async function InvoiceDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  const total = Number(invoice.total ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const remainingAmount = total - paidAmount;
  const currency = normalizeCurrency(invoice.currency);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
                Faktura
              </p>

              <h1 className="mt-2 text-3xl font-bold text-white">
                {invoice.invoiceNumber || invoice.id}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Szczegóły faktury, kwoty, płatność i szybkie akcje.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/invoices"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Wróć
              </Link>

              <Link
                href={`/dashboard/invoices/${invoice.id}/edit`}
                className="rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20"
              >
                Edytuj
              </Link>

              <Link
                href={`/dashboard/invoices/${invoice.id}/print`}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Drukuj / PDF
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Status</p>
            <p className="mt-2 text-2xl font-bold text-white">{statusLabel(invoice.status)}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Suma brutto</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatMoney(invoice.total, currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Zapłacono</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {formatMoney(invoice.paidAmount, currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Pozostało</p>
            <p className="mt-2 text-2xl font-bold text-rose-300">
              {formatMoney(remainingAmount, currency)}
            </p>
          </div>
        </section>

        <InvoiceStatusQuickActions
          invoiceId={invoice.id}
          currentStatus={invoice.status}
          total={total}
          paidAmount={paidAmount}
        />

        <InvoicePaymentRecorder
          invoiceId={invoice.id}
          total={total}
          paidAmount={paidAmount}
          currency={currency}
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-bold text-white">Dane faktury</h2>

            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Numer faktury</span>
                <span className="font-medium text-white">{invoice.invoiceNumber || "—"}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Data faktury</span>
                <span className="font-medium text-white">{formatDate(invoice.issueDate)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Termin płatności</span>
                <span className="font-medium text-white">{formatDate(invoice.dueDate)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Waluta</span>
                <span className="font-medium text-white">{currency}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-400">ID faktury</span>
                <span className="break-all text-right font-mono text-xs text-slate-300">
                  {invoice.id}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-bold text-white">Klient</h2>

            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Nazwa</span>
                <span className="font-medium text-white">{customerName(invoice.customer)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">E-mail</span>
                <span className="font-medium text-white">{invoice.customer.email || "—"}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">Telefon</span>
                <span className="font-medium text-white">{invoice.customer.phone || "—"}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Adres</span>
                <span className="max-w-sm text-right font-medium text-white">
                  {customerAddress(invoice.customer)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-bold text-white">Kwoty</h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Subtotal</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatMoney(invoice.subtotal, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Podatek %</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {Number(invoice.taxRate ?? 0).toFixed(2)}%
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Kwota podatku</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatMoney(invoice.taxAmount, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Total</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-cyan-200">
                    {formatMoney(invoice.total, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Zapłacono</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                    {formatMoney(invoice.paidAmount, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-slate-950/60 px-4 py-3 text-slate-400">Pozostało</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-300">
                    {formatMoney(remainingAmount, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-bold text-white">Notatki / treść faktury</h2>

          <div className="mt-4 min-h-32 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            {invoice.notes ? (
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            ) : (
              <p className="text-slate-500">Brak notatek.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}