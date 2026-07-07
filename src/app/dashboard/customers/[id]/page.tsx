import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

type TimelineItem = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string | null;
  amount?: string | null;
  createdAt?: Date | string | null;
  href?: string | null;
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

function formatDate(value?: Date | string | null) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
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

  return String(value);
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    PRIVATE: "Privat",
    COMPANY: "Firma",
    ACTIVE: "Aktywna",
    COMPLETED: "Abgeschlossen",
    ABANDONED: "Porzucona",
    EXPIRED: "Abgelaufen",
    NEW: "Nowe",
    IN_PROGRESS: "W toku",
    WAITING_FOR_CUSTOMER: "Czeka na Kunden",
    CONFIRMED: "Potwierdzone",
    SCHEDULED: "Zaplanowane",
    CANCELLED: "Anulowane",
    DRAFT: "Robocze",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    READY_TO_SEND: "Bereit zum Senden",
    AI_REVIEW: "AI review",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Do kontroli",
    PAID: "Bezahlt",
    PARTIALLY_PAID: "Teilweise bezahlt",
    OVERDUE: "Po terminie",
    PENDING: "Ausstehend",
    FAILED: "Nieudane",
    REFUNDED: "Erstattet",
  };

  const key = String(status || "").toUpperCase();

  return labels[key] ?? status ?? "—";
}

function customerName(customer: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "Kein Name";
}

function customerAddress(customer: {
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const line = [customer.street, customer.zipCode, customer.city, customer.country]
    .filter(Boolean)
    .join(", ");

  return line || "—";
}

function InfoCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: unknown;
  tone?: "default" | "cyan" | "green" | "amber" | "red";
}) {
  const className =
    tone === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
      : tone === "green"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
        : tone === "amber"
          ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
          : tone === "red"
            ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
            : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-3xl border p-5 ${className}`}>
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

function DataTable({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: TimelineItem[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>

        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-zinc-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-500">
          Keine Daten.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-black/20 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name / numer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Betrag</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {items.map((item) => (
                <tr key={`${item.id}-${item.href ?? item.title}`} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-bold text-white">{item.title}</p>
                    <p className="mt-1 max-w-md truncate text-xs text-zinc-500">
                      {item.subtitle || item.id}
                    </p>
                  </td>

                  <td className="px-4 py-3 text-zinc-300">
                    {statusLabel(item.status)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-emerald-300">
                    {item.amount || "—"}
                  </td>

                  <td className="px-4 py-3 text-zinc-400">
                    {formatDate(item.createdAt)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                      >
                        Details
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function CustomerDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const prisma = getPrisma();

  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
    include: {
      sessions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      estimates: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      quotes: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      invoices: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        take: 10,
      },
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      attachments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const name = customerName(customer);
  const address = customerAddress(customer);
  const invoicesTotal = customer.invoices.reduce((sum, invoice) => {
    return sum + toNumber(invoice.total);
  }, 0);

  const invoicesPaid = customer.invoices.reduce((sum, invoice) => {
    return sum + toNumber(invoice.paidAmount);
  }, 0);

  const payments = customer.invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({
      ...payment,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.id,
    })),
  );

  const paymentTotal = payments.reduce((sum, payment) => {
    if (payment.status !== "PAID") return sum;

    return sum + toNumber(payment.amount);
  }, 0);

  const orderItems: TimelineItem[] = customer.orders.map((order) => ({
    id: order.id,
    title: order.orderNumber,
    subtitle: order.title || order.description || order.serviceType,
    status: order.status,
    amount:
      order.finalPrice || order.estimatedPrice
        ? formatMoney(order.finalPrice ?? order.estimatedPrice, order.currency)
        : null,
    createdAt: order.createdAt,
    href: `/dashboard/orders/${order.id}`,
  }));

  const estimateItems: TimelineItem[] = customer.estimates.map((estimate) => ({
    id: estimate.id,
    title: estimate.estimateNumber,
    subtitle: estimate.title || estimate.description || "Kalkulation",
    status: estimate.status,
    amount: formatMoney(estimate.total, estimate.currency),
    createdAt: estimate.createdAt,
    href: `/dashboard/estimates/${estimate.id}`,
  }));

  const invoiceItems: TimelineItem[] = customer.invoices.map((invoice) => ({
    id: invoice.id,
    title: invoice.invoiceNumber,
    subtitle: invoice.notes || "Rechnung",
    status: invoice.status,
    amount: formatMoney(invoice.total, invoice.currency),
    createdAt: invoice.createdAt,
    href: `/dashboard/invoices/${invoice.id}`,
  }));

  const paymentItems: TimelineItem[] = payments.map((payment) => ({
    id: payment.id,
    title: payment.externalRef || payment.invoiceNumber || payment.id,
    subtitle: `Rechnung: ${payment.invoiceNumber}`,
    status: payment.status,
    amount: formatMoney(payment.amount, payment.currency),
    createdAt: payment.paidAt ?? payment.createdAt,
    href: `/dashboard/payments/${payment.id}`,
  }));

  const sessionItems: TimelineItem[] = customer.sessions.map((session) => ({
    id: session.id,
    title: session.source || "Sesja",
    subtitle: session.id,
    status: session.status,
    createdAt: session.createdAt,
    href: null,
  }));

  const messageItems: TimelineItem[] = customer.messages.map((message) => ({
    id: message.id,
    title: message.role,
    subtitle: message.content,
    status: message.role,
    createdAt: message.createdAt,
    href: null,
  }));

  const notificationItems: TimelineItem[] = customer.notifications.map((notification) => ({
    id: notification.id,
    title: notification.subject || notification.recipient,
    subtitle: notification.message,
    status: notification.status,
    createdAt: notification.createdAt,
    href: `/dashboard/notifications/${notification.id}`,
  }));

  const attachmentItems: TimelineItem[] = customer.attachments.map((attachment) => ({
    id: attachment.id,
    title: attachment.fileName,
    subtitle: attachment.url,
    status: attachment.type,
    createdAt: attachment.createdAt,
    href: `/dashboard/attachments/${attachment.id}`,
  }));

  const auditItems: TimelineItem[] = customer.auditLogs.map((log) => ({
    id: log.id,
    title: `${log.action} · ${log.entityType}`,
    subtitle: log.message || log.entityId || log.id,
    status: log.action,
    createdAt: log.createdAt,
    href: `/dashboard/audit-logs/${log.id}`,
  }));

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/customers"
              className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              ← Zurück zu den Kunden
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS CRM / Customers
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              {name}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Kundendetails, Kontakt, Standort, Aufträge, Kalkulationen, Rechnungen,
              Zahlungen und Systemhistorie.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionLink href="/dashboard/customers" label="Kundenliste" />
            <ActionLink
              href={`/dashboard/invoices?customerId=${customer.id}`}
              label="Kundenrechnungen"
              variant="primary"
            />
            <ActionLink
              href={`/dashboard/orders?customerId=${customer.id}`}
              label="Kundenaufträge"
            />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Kundentyp" value={statusLabel(customer.type)} tone="cyan" />
          <InfoCard label="Rechnungen" value={customer.invoices.length} />
          <InfoCard label="Bezahlt" value={formatMoney(invoicesPaid, "CHF")} tone="green" />
          <InfoCard label="Zahlungen" value={formatMoney(paymentTotal, "CHF")} tone="green" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Kundendaten</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Kontakt- und Adressdaten des Kunden.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionLink href={`mailto:${customer.email ?? ""}`} label="Email" />
              <ActionLink href={`tel:${customer.phone ?? ""}`} label="Telefon" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="ID" value={customer.id} />
            <InfoCard label="Name" value={name} />
            <InfoCard label="Firma" value={customer.companyName} />
            <InfoCard label="Person" value={[customer.firstName, customer.lastName].filter(Boolean).join(" ")} />
            <InfoCard label="Email" value={customer.email} />
            <InfoCard label="Telefon" value={customer.phone} />
            <InfoCard label="Adressese" value={address} />
            <InfoCard label="Notizen" value={customer.notes} />
            <InfoCard label="Erstellt" value={customer.createdAt} />
            <InfoCard label="Aktualisierung" value={customer.updatedAt} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Aufträge" value={customer.orders.length} />
          <InfoCard label="Kalkulationen" value={customer.estimates.length} />
          <InfoCard label="Rechnungen total" value={formatMoney(invoicesTotal, "CHF")} tone="cyan" />
          <InfoCard label="Offen" value={formatMoney(Math.max(invoicesTotal - invoicesPaid, 0), "CHF")} tone={invoicesTotal - invoicesPaid > 0 ? "red" : "green"} />
        </section>

        <div className="grid gap-6">
          <DataTable
            title="Aufträge"
            description="Letzte mit dem Kunden verknüpfte Aufträge."
            items={orderItems}
          />

          <DataTable
            title="Kalkulationen"
            description="Kalkulationen und Kostenangebote des Kunden."
            items={estimateItems}
          />

          <DataTable
            title="Rechnungen"
            description="Für diesen Kunden ausgestellte Rechnungen."
            items={invoiceItems}
          />

          <DataTable
            title="Zahlungen"
            description="Zahlungen aus Kundenrechnungen."
            items={paymentItems}
          />

          <DataTable
            title="Sesje"
            description="Gesprächssitzungen und Kontaktquellen."
            items={sessionItems}
          />

          <DataTable
            title="Nachrichten"
            description="Letzte Nachrichten aus Kundengesprächen."
            items={messageItems}
          />

          <DataTable
            title="Benachrichtigungen"
            description="Historie der gesendeten oder ausstehenden Benachrichtigungen."
            items={notificationItems}
          />

          <DataTable
            title="Anhänge"
            description="Dokumente und Dateien des Kunden."
            items={attachmentItems}
          />

          <DataTable
            title="Audit logi"
            description="Systemhistorie des Kunden."
            items={auditItems}
          />
        </div>
      </section>
    </main>
  );
}