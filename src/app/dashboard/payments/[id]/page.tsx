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

  if (/^[A-Z]{3}$/.test(raw)) {
    return raw;
  }

  if (raw.startsWith("CHF")) {
    return "CHF";
  }

  if (raw.startsWith("EUR")) {
    return "EUR";
  }

  if (raw.startsWith("USD")) {
    return "USD";
  }

  if (raw.startsWith("PLN")) {
    return "PLN";
  }

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
  if (!value) {
    return "—";
  }

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
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || customer.email || "—";
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PENDING: "Ausstehend",
    PAID: "Bezahlt",
    FAILED: "Fehlgeschlagen",
    REFUNDED: "Erstattet",
    CANCELLED: "Storniert",
    DRAFT: "Entwurf",
    SENT: "Versendet",
    PARTIALLY_PAID: "Teilweise bezahlt",
    OVERDUE: "Überfällig",
  };

  const key = String(status || "").toUpperCase();

  return labels[key] ?? status ?? "—";
}

function methodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "Banküberweisung",
    CASH: "Barzahlung",
    TWINT: "TWINT",
    CARD: "Karte",
    OTHER: "Andere Methode",
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
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/payments"
              className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              ← Zurück zu Zahlungen
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS CRM / Zahlung
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Zahlungsdetails
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Zahlung, zugehörige Rechnung, Kunde, Auftrag und Systemverlauf.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionLink href="/dashboard/payments" label="Zahlungsliste" />

            {invoice?.id ? (
              <ActionLink
                href={`/dashboard/invoices/${invoice.id}`}
                label="Rechnung öffnen"
                variant="primary"
              />
            ) : null}

            {invoice?.id ? (
              <ActionLink
                href={`/documents/invoices/${invoice.id}/print`}
                label="Rechnung drucken / PDF"
              />
            ) : null}
          </div>
        </div>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Zahlungsstatus"
              value={statusLabel(payment.status)}
              tone="cyan"
            />
            <InfoCard
              label="Zahlungsbetrag"
              value={formatMoney(paymentAmount, currency)}
              tone="green"
            />
            <InfoCard label="Methode" value={methodLabel(payment.method)} />
            <InfoCard label="Referenz" value={payment.externalRef} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 xl:col-span-2">
            <h2 className="text-xl font-black text-white">Zahlung</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard label="ID" value={payment.id} />
              <InfoCard label="Status" value={statusLabel(payment.status)} />
              <InfoCard label="Betrag" value={formatMoney(payment.amount, currency)} />
              <InfoCard label="Währung" value={currency} />
              <InfoCard label="Methode" value={methodLabel(payment.method)} />
              <InfoCard label="Referenz" value={payment.externalRef} />
              <InfoCard label="Notiz" value={payment.notes} />
              <InfoCard label="Bezahlt am" value={payment.paidAt} />
              <InfoCard label="Erstellt am" value={payment.createdAt} />
              <InfoCard label="Aktualisiert am" value={payment.updatedAt} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Verknüpfungen</h2>

            <div className="mt-5 grid gap-3">
              {invoice?.id ? (
                <>
                  <ActionLink
                    href={`/dashboard/invoices/${invoice.id}`}
                    label={`Rechnung ${invoice.invoiceNumber}`}
                    variant="primary"
                  />

                  <ActionLink
                    href={`/documents/invoices/${invoice.id}/print`}
                    label="Rechnung drucken / PDF"
                  />
                </>
              ) : (
                <InfoCard label="Rechnung" value="Keine zugehörige Rechnung" />
              )}

              {customer?.id ? (
                <ActionLink
                  href={`/dashboard/customers/${customer.id}`}
                  label={`Kunde: ${customerName(customer)}`}
                />
              ) : (
                <InfoCard label="Kunde" value="Kein Kunde" />
              )}

              {order?.id ? (
                <ActionLink
                  href={`/dashboard/orders/${order.id}`}
                  label={`Auftrag ${order.orderNumber}`}
                />
              ) : (
                <InfoCard label="Auftrag" value="Kein Auftrag" />
              )}

              {quote?.id ? (
                <ActionLink
                  href={`/dashboard/quotes/${quote.id}`}
                  label={`Angebot ${quote.quoteNumber}`}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Rechnung</h2>

            {invoice ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Nummer" value={invoice.invoiceNumber} />
                <InfoCard label="Status" value={statusLabel(invoice.status)} />
                <InfoCard label="Total" value={formatMoney(invoice.total, currency)} />
                <InfoCard label="Bezahlt" value={formatMoney(invoice.paidAmount, currency)} />
                <InfoCard
                  label="Offen"
                  value={formatMoney(invoiceRemaining, currency)}
                  tone={invoiceRemaining > 0 ? "red" : "green"}
                />
                <InfoCard label="Fällig bis" value={invoice.dueDate} />
                <InfoCard label="Ausgestellt am" value={invoice.issueDate} />
                <InfoCard label="Bezahlt am" value={invoice.paidAt} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Keine zugehörige Rechnung.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-xl font-black text-white">Kunde</h2>

            {customer ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard label="Name" value={customerName(customer)} />
                <InfoCard label="Typ" value={customer.type} />
                <InfoCard label="E-Mail" value={customer.email} />
                <InfoCard label="Telefon" value={customer.phone} />
                <InfoCard label="Strasse" value={customer.street} />
                <InfoCard
                  label="PLZ / Ort"
                  value={[customer.zipCode, customer.city].filter(Boolean).join(" ")}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Kein zugehöriger Kunde vorhanden.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Systemverlauf</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Neueste Audit-Einträge im Zusammenhang mit Zahlung oder Rechnung.
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
                    <th className="border-b border-white/10 px-3 py-3">Datum</th>
                    <th className="border-b border-white/10 px-3 py-3">Aktion</th>
                    <th className="border-b border-white/10 px-3 py-3">Typ</th>
                    <th className="border-b border-white/10 px-3 py-3">
                      Beschreibung
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/10">
                      <td className="px-3 py-3 text-zinc-400">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-3 py-3 font-bold text-zinc-200">
                        {formatValue(log.action)}
                      </td>
                      <td className="px-3 py-3 text-zinc-400">
                        {formatValue(log.entityType)}
                      </td>
                      <td className="px-3 py-3 text-zinc-300">
                        {formatValue(log.message)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              Keine Audit-Einträge vorhanden.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}