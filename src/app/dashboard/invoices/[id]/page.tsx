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

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "0").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown, currency: string | null | undefined = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
  }).format(toNumber(value));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    case "PENDING":
      return "Oczekująca";
    case "FAILED":
      return "Nieudana";
    case "REFUNDED":
      return "Zwrócona";
    default:
      return status || "Brak statusu";
  }
}

function paymentMethodLabel(method: string | null | undefined) {
  switch (method) {
    case "BANK_TRANSFER":
      return "Przelew bankowy";
    case "CASH":
      return "Gotówka";
    case "TWINT":
      return "TWINT";
    case "CARD":
      return "Karta";
    case "OTHER":
      return "Inna metoda";
    default:
      return method || "—";
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

  const total = Number(invoice.total ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const remainingAmount = Math.max(total - paidAmount, 0);
  const currency = normalizeCurrency(invoice.currency);

  const paymentsTotal = invoice.payments.reduce((sum, payment) => {
    if (payment.status !== "PAID") return sum;

    return sum + toNumber(payment.amount);
  }, 0);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
                Faktura
              </p>

              <h1 className="mt-2 text-3xl font-bold text-white">
                {invoice.invoiceNumber || invoice.id}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Szczegóły faktury, kwoty, płatność, historia wpłat i szybkie akcje.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/invoices"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.05]"
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
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Status</p>
            <p className="mt-2 text-2xl font-bold text-white">{statusLabel(invoice.status)}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Suma brutto</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatMoney(invoice.total, currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Zapłacono</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {formatMoney(invoice.paidAmount, currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Historia wpłat</h2>
              <p className="mt-2 text-sm text-slate-400">
                Wszystkie płatności zapisane dla tej faktury.
              </p>
            </div>

            <div className="grid gap-2 text-right text-sm">
              <p className="text-slate-400">
                Liczba wpłat:{" "}
                <span className="font-bold text-white">{invoice.payments.length}</span>
              </p>
              <p className="text-slate-400">
                Suma opłaconych rekordów:{" "}
                <span className="font-bold text-emerald-300">
                  {formatMoney(paymentsTotal, currency)}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            {invoice.payments.length > 0 ? (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-black/20 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Kwota</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Metoda</th>
                    <th className="px-4 py-3">Referencja</th>
                    <th className="px-4 py-3 text-right">Akcja</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-slate-300">
                        <div>
                          <p className="font-medium text-white">
                            {formatDateTime(payment.paidAt ?? payment.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Dodano: {formatDateTime(payment.createdAt)}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-bold text-emerald-300">
                        {formatMoney(payment.amount, payment.currency || currency)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {statusLabel(payment.status)}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {paymentMethodLabel(payment.method)}
                      </td>

                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-400">
                        {payment.externalRef || payment.notes || "—"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/payments/${payment.id}`}
                          className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                        >
                          Szczegóły płatności
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="bg-black/20 p-6 text-sm text-slate-500">
                Brak wpłat dla tej faktury. Dodaj pierwszą wpłatę powyżej.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold text-white">Dane faktury</h2>

            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-slate-400">Numer faktury</span>
                <span className="font-medium text-white">{invoice.invoiceNumber || "—"}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-slate-400">Data faktury</span>
                <span className="font-medium text-white">{formatDate(invoice.issueDate)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-slate-400">Termin płatności</span>
                <span className="font-medium text-white">{formatDate(invoice.dueDate)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
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

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold text-white">Klient</h2>

            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-slate-400">Nazwa</span>
                <span className="font-medium text-white">{customerName(invoice.customer)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-slate-400">E-mail</span>
                <span className="font-medium text-white">{invoice.customer.email || "—"}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">Kwoty</h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Subtotal</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatMoney(invoice.subtotal, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Podatek %</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {Number(invoice.taxRate ?? 0).toFixed(2)}%
                  </td>
                </tr>

                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Kwota podatku</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {formatMoney(invoice.taxAmount, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Total</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-cyan-200">
                    {formatMoney(invoice.total, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Zapłacono</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                    {formatMoney(invoice.paidAmount, currency)}
                  </td>
                </tr>

                <tr>
                  <td className="bg-black/20 px-4 py-3 text-slate-400">Pozostało</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-300">
                    {formatMoney(remainingAmount, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-bold text-white">Notatki / treść faktury</h2>

          <div className="mt-4 min-h-32 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
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