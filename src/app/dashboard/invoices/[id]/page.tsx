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
    DRAFT: "Robocza",
    SENT: "Wysłana",
    PARTIALLY_PAID: "Częściowo opłacona",
    PAID: "Opłacona",
    OVERDUE: "Po terminie",
    CANCELLED: "Anulowana",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function paymentStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    PENDING: "Oczekuje",
    PAID: "Opłacona",
    FAILED: "Błąd",
    REFUNDED: "Zwrócona",
    CANCELLED: "Anulowana",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function paymentMethodLabel(method: string | null | undefined) {
  const labels: Record<string, string> = {
    CASH: "Gotówka",
    BANK_TRANSFER: "Przelew",
    TWINT: "TWINT",
    CARD: "Karta",
    OTHER: "Inne",
  };

  if (!method) {
    return "—";
  }

  return labels[method] ?? method;
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
                ← Wróć do faktur
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Invoice
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                Faktura dla klienta: {customerName(invoice.customer)}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Status
              </p>
              <p className="mt-2 text-lg font-black text-cyan-100">
                {invoiceStatusLabel(invoice.status)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Link
            href={`/documents/invoices/${invoice.id}/print`}
            className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20"
          >
            Otwórz fakturę DE
          </Link>

          <Link
            href={`/documents/invoices/${invoice.id}/print`}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20"
          >
            Drukuj / PDF
          </Link>

          <Link
            href="/dashboard/invoices"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Lista faktur
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Klient</p>
            <p className="mt-2 text-xl font-semibold">
              {customerName(invoice.customer)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {invoice.customer?.email ??
                invoice.customer?.phone ??
                "Brak kontaktu"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Data wystawienia</p>
            <p className="mt-2 text-xl font-semibold">
              {formatDate(invoice.issueDate)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Termin: {formatDate(invoice.dueDate)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Zapłacono</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(invoice.paidAmount, invoice.currency)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Wpłat: {invoice.payments.length}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-100/70">Pozostało</p>
            <p className="mt-2 text-xl font-black text-amber-100">
              {formatMoney(openAmount, invoice.currency)}
            </p>
            <p className="mt-1 text-sm text-amber-100/60">
              Do rozliczenia
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300 p-5 text-neutral-950">
            <p className="text-sm font-semibold opacity-70">Suma</p>
            <p className="mt-2 text-2xl font-black">
              {formatMoney(invoice.total, invoice.currency)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Dane klienta</h2>

            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">Nazwa: </span>
                {customerName(invoice.customer)}
              </p>
              <p>
                <span className="text-neutral-500">Adres: </span>
                {customerAddress || "—"}
              </p>
              <p>
                <span className="text-neutral-500">Email: </span>
                {invoice.customer?.email ?? "—"}
              </p>
              <p>
                <span className="text-neutral-500">Telefon: </span>
                {invoice.customer?.phone ?? "—"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Powiązanie ze zleceniem</h2>

            <div className="mt-4 space-y-3 text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">Zlecenie: </span>
                {invoice.orderId ? (
                  <Link
                    href={`/dashboard/orders/${invoice.orderId}`}
                    className="font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    Otwórz zlecenie
                  </Link>
                ) : (
                  "—"
                )}
              </p>
              <p>
                <span className="text-neutral-500">Adres usługi: </span>
                {serviceAddress || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Podsumowanie faktury</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Subtotal</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.subtotal, invoice.currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">VAT / MWST</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.taxAmount, invoice.currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Total</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.total, invoice.currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-neutral-400">Zapłacono</p>
              <p className="mt-2 text-xl font-semibold">
                {formatMoney(invoice.paidAmount, invoice.currency)}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <p className="text-sm text-cyan-100/70">Otwarte</p>
              <p className="mt-2 text-xl font-black text-cyan-100">
                {formatMoney(openAmount, invoice.currency)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Notatka
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {invoice.notes ?? "—"}
            </p>
          </div>
        </section>

        <AddInvoicePaymentForm
          invoiceId={invoice.id}
          openAmount={openAmount}
          currency={invoice.currency}
        />

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Płatności</h2>

          {invoice.payments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Brak płatności dla tej faktury.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Data</th>
                    <th className="px-4 py-4">Metoda</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Kwota</th>
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
                        {formatMoney(payment.amount, payment.currency)}
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
            <h2 className="text-lg font-semibold">Załączniki</h2>
            <p className="mt-2 text-3xl font-black">
              {invoice.attachments.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Później PDF, zdjęcia i potwierdzenia.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">PDF</h2>
            <p className="mt-2 text-sm text-neutral-400">
              {invoice.pdfUrl ?? "PDF nie został jeszcze zapisany jako plik."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Status</h2>
            <p className="mt-2 text-2xl font-black">
              {invoiceStatusLabel(invoice.status)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Później: wysyłka email i oznaczanie płatności.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}