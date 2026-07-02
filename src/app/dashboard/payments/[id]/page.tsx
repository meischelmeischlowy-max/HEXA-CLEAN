import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";
import { notFound } from "next/navigation";

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

function normalizeCurrency(value?: string | null) {
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

function formatMoney(value: unknown, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function customerName(customer?: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
} | null) {
  if (!customer) return "—";
  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || customer.email || "—";
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PENDING: "Oczekująca",
    PAID: "Opłacona",
    FAILED: "Nieudana",
    REFUNDED: "Zwrócona",
    CANCELLED: "Anulowana",
    DRAFT: "Szkic",
    SENT: "Wysłana",
    PARTIALLY_PAID: "Częściowo opłacona",
    OVERDUE: "Po terminie",
  };

  const key = String(status || "").toUpperCase();

  return labels[key] ?? status ?? "—";
}

function methodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "Przelew bankowy",
    CASH: "Gotówka",
    TWINT: "TWINT",
    CARD: "Karta",
    OTHER: "Inna metoda",
  };

  const key = String(method || "").toUpperCase();

  return labels[key] ?? method ?? "—";
}

function InfoCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: unknown;
  tone?: "default" | "green" | "cyan" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
      : tone === "cyan"
        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
        : tone === "red"
          ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
          : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold">{formatValue(value)}</p>
    </div>
  );
}

function ActionLink({
  href,
  label,
  variant = "secondary",
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/20"
      : "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07]";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const payment = await prisma.payment.findUnique({
    where: {
      id,
    },
    include: {
      invoice: {
        include: {
          customer: true,
          order: true,
          quote: true,
        },
      },
      order: true,
    },
  });

  if (!payment) {
    notFound();
  }

  const invoice = payment.invoice;
  const customer = invoice?.customer ?? null;
  const order = payment.order ?? invoice?.order ?? null;
  const quote = invoice?.quote ?? null;
  const currency = normalizeCurrency(payment.currency ?? invoice?.currency ?? "CHF");

  const auditLogFilters = [
    {
      entityType: "Payment",
      entityId: payment.id,
    },
  ];

  if (invoice?.id) {
    auditLogFilters.push({
      entityType: "Invoice",
      entityId: invoice.id,
    });
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: auditLogFilters,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  const paymentAmount = toNumber(payment.amount);
  const invoiceTotal = toNumber(invoice?.total);
  const invoicePaid = toNumber(invoice?.paidAmount);
  const invoiceRemaining = Math.max(invoiceTotal - invoicePaid, 0);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/payments"
              className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              ← Wróć do płatności
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS CRM / Payments
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Szczegóły płatności
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Podgląd wpłaty, powiązanej faktury, klienta, zlecenia oraz historii
              systemowej.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionLink href="/dashboard/payments" label="Lista płatności" />

            {invoice?.id ? (
              <ActionLink
                href={`/dashboard/invoices/${invoice.id}`}
                label="Otwórz fakturę"
                variant="primary"
              />
            ) : null}

            {invoice?.id ? (
              <ActionLink
                href={`/dashboard/invoices/${invoice.id}/print`}
                label="Drukuj fakturę"
              />
            ) : null}
          </div>
        </div>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Status płatności" value={statusLabel(payment.status)} tone="cyan" />
            <InfoCard label="Kwota wpłaty" value={formatMoney(paymentAmount, currency)} tone="green" />
            <InfoCard label="Metoda" value={methodLabel(payment.method)} />
            <InfoCard label="Referencja" value={payment.externalRef} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 xl:col-span-2">
            <h2 className="text-xl font-black text-white">Płatność</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard label="ID" value={payment.id} />
              <InfoCard label="Status" value={statusLabel(payment.status)} />
              <InfoCard label="Kwota" value={formatMoney(payment.amount, currency)} />
              <InfoCard label="Waluta" value={currency} />
              <InfoCard label="Metoda" value={methodLabel(payment.method)} />
              <InfoCard label="Referencja" value={payment.externalRef} />
              <InfoCard label="Notatka" value={payment.notes} />
              <InfoCard label="Opłacono" value={payment.paidAt} />
              <InfoCard label="Utworzono" value={payment.createdAt} />
              <InfoCard label="Aktualizacja" value={payment.updatedAt} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Powiązania</h2>

            <div className="mt-5 grid gap-3">
              {invoice?.id ? (
                <ActionLink
                  href={`/dashboard/invoices/${invoice.id}`}
                  label={`Faktura ${invoice.invoiceNumber}`}
                  variant="primary"
                />
              ) : (
                <InfoCard label="Faktura" value="Brak powiązanej faktury" />
              )}

              {customer?.id ? (
                <ActionLink
                  href={`/dashboard/customers/${customer.id}`}
                  label={`Klient: ${customerName(customer)}`}
                />
              ) : (
                <InfoCard label="Klient" value="Brak klienta" />
              )}

              {order?.id ? (
                <ActionLink
                  href={`/dashboard/orders/${order.id}`}
                  label={`Zlecenie ${order.orderNumber}`}
                />
              ) : (
                <InfoCard label="Zlecenie" value="Brak zlecenia" />
              )}

              {quote?.id ? (
                <ActionLink
                  href={`/dashboard/quotes/${quote.id}`}
                  label={`Oferta ${quote.quoteNumber}`}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Faktura</h2>

            {invoice ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Numer" value={invoice.invoiceNumber} />
                <InfoCard label="Status" value={statusLabel(invoice.status)} />
                <InfoCard label="Total" value={formatMoney(invoice.total, currency)} />
                <InfoCard label="Zapłacono" value={formatMoney(invoice.paidAmount, currency)} />
                <InfoCard label="Pozostało" value={formatMoney(invoiceRemaining, currency)} tone={invoiceRemaining > 0 ? "red" : "green"} />
                <InfoCard label="Termin" value={invoice.dueDate} />
                <InfoCard label="Wystawiono" value={invoice.issueDate} />
                <InfoCard label="Opłacono dnia" value={invoice.paidAt} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">Brak powiązanej faktury.</p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Klient</h2>

            {customer ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Nazwa" value={customerName(customer)} />
                <InfoCard label="Typ" value={customer.type} />
                <InfoCard label="Email" value={customer.email} />
                <InfoCard label="Telefon" value={customer.phone} />
                <InfoCard label="Ulica" value={customer.street} />
                <InfoCard label="Kod / miasto" value={[customer.zipCode, customer.city].filter(Boolean).join(" ")} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">Brak powiązanego klienta.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Historia systemowa</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Ostatnie wpisy audytu powiązane z płatnością albo fakturą.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-zinc-400">
              {auditLogs.length}
            </span>
          </div>

          {auditLogs.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <tr>
                    <th className="border-b border-white/10 px-3 py-3">Data</th>
                    <th className="border-b border-white/10 px-3 py-3">Akcja</th>
                    <th className="border-b border-white/10 px-3 py-3">Typ</th>
                    <th className="border-b border-white/10 px-3 py-3">Opis</th>
                  </tr>
                </thead>

                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/10">
                      <td className="px-3 py-3 text-zinc-400">{formatDate(log.createdAt)}</td>
                      <td className="px-3 py-3 font-bold text-zinc-200">{formatValue(log.action)}</td>
                      <td className="px-3 py-3 text-zinc-400">{formatValue(log.entityType)}</td>
                      <td className="px-3 py-3 text-zinc-300">{formatValue(log.message)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">Brak wpisów audytu.</p>
          )}
        </section>
      </section>
    </main>
  );
}