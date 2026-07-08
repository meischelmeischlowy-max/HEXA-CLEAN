import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";
import { notFound } from "next/navigation";
import RecordActionPanel from "../../../../components/dashboard/RecordActionPanel";
import {
  buildCustomerMissingItems,
  getCustomerDetailAction,
  getToneClassName,
  type CustomerMissingItem,
} from "../../../../lib/dashboard/next-action";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ action?: string }>;
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
  if (!value) return "-";

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
    return "-";
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
    ACTIVE: "Aktiv",
    COMPLETED: "Abgeschlossen",
    ABANDONED: "Abgebrochen",
    EXPIRED: "Abgelaufen",
    NEW: "Neu",
    IN_PROGRESS: "In Arbeit",
    WAITING_FOR_CUSTOMER: "Wartet auf Kunde",
    CONFIRMED: "Bestaetigt",
    SCHEDULED: "Geplant",
    CANCELLED: "Storniert",
    DRAFT: "Entwurf",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    READY_TO_SEND: "Bereit zum Senden",
    AI_REVIEW: "AI-Pruefung",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Pruefung erforderlich",
    PAID: "Bezahlt",
    PARTIALLY_PAID: "Teilweise bezahlt",
    OVERDUE: "Ueberfaellig",
    PENDING: "Ausstehend",
    FAILED: "Fehlgeschlagen",
    REFUNDED: "Erstattet",
  };

  const key = String(status || "").toUpperCase();

  return labels[key] ?? status ?? "-";
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

  return line || "-";
}

function isOpenInvoiceStatus(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  return (
    normalized === "SENT" ||
    normalized === "PARTIALLY_PAID" ||
    normalized === "OVERDUE"
  );
}

function isInvoiceOverdue(invoice: {
  status?: string | null;
  dueDate?: Date | null;
}) {
  const status = String(invoice.status || "").toUpperCase();

  if (status === "OVERDUE") {
    return true;
  }

  if (!invoice.dueDate) {
    return false;
  }

  return isOpenInvoiceStatus(status) && invoice.dueDate < new Date();
}

function buildMissingDataMailto({
  email,
  name,
  missingItems,
}: {
  email: string;
  name: string;
  missingItems: CustomerMissingItem[];
}) {
  const missingText = missingItems
    .filter((item) => item.isMissing)
    .map((item) => `- ${item.title}`)
    .join("\n");

  const subject = "Fehlende Angaben fuer Ihre Anfrage";
  const body = `Guten Tag ${name}

vielen Dank fuer Ihre Anfrage.

Damit wir sauber weiterarbeiten koennen, fehlen uns noch folgende Angaben:

${missingText}

Bitte senden Sie uns die fehlenden Informationen kurz per Antwort auf diese E-Mail.

Freundliche Gruesse
HEXA CLEAN`;

  return `mailto:${email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

function InfoCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: unknown;
  tone?: "neutral" | "cyan" | "green" | "amber" | "red";
}) {
  return (
    <div className={`rounded-3xl border p-5 ${getToneClassName(tone)}`}>
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

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

function MissingChecklist({
  customerId,
  customerEmail,
  customerPhone,
  customerNameValue,
  items,
  focus,
}: {
  customerId: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerNameValue: string;
  items: CustomerMissingItem[];
  focus: boolean;
}) {
  const missingItems = items.filter((item) => item.isMissing);
  const mailtoHref =
    customerEmail && missingItems.length > 0
      ? buildMissingDataMailto({
          email: customerEmail,
          name: customerNameValue,
          missingItems,
        })
      : null;

  return (
    <section
      id="fehlende-daten"
      className={`rounded-3xl border p-5 ${
        focus
          ? "border-cyan-300/50 bg-cyan-400/[0.08] ring-2 ring-cyan-300/30"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300/70">
            Aktions-Checkliste
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            Fehlende Daten und naechste Schritte
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
            Diese Checkliste gehoert nur zu diesem Kunden. Hier wird geklaert,
            was fehlt und welche Aktion wirklich sinnvoll ist.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionLink
            href={`/dashboard/customers/${customerId}/edit`}
            label="Daten manuell aktualisieren"
            variant="primary"
          />

          {mailtoHref ? (
            <ActionLink href={mailtoHref} label="E-Mail vorbereiten" />
          ) : null}

          {customerPhone ? (
            <ActionLink href={`tel:${customerPhone}`} label="Anrufen" />
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <article
            key={item.key}
            className={`rounded-2xl border p-4 ${
              item.isMissing
                ? getToneClassName(item.tone)
                : "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-100"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black">
                  {item.isMissing ? "Offen" : "OK"} · {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 opacity-75">
                  {item.description}
                </p>
              </div>

              {item.isMissing ? (
                <ActionLink href={item.actionHref} label={item.actionLabel} />
              ) : (
                <span className="w-fit rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100">
                  Erledigt
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      {missingItems.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-sm font-bold text-emerald-100">
          Kundenprofil ist ausreichend vollstaendig. Weitere Arbeit laeuft ueber
          Auftrag, Kalkulation, Offerte oder Rechnung.
        </div>
      ) : null}
    </section>
  );
}

function CustomerListSection({
  id,
  title,
  description,
  items,
  emptyLabel = "Keine Daten.",
}: {
  id?: string;
  title: string;
  description: string;
  items: TimelineItem[];
  emptyLabel?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-zinc-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <article
              key={`${item.id}-${item.href ?? item.title}`}
              className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.035] md:grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)_minmax(130px,0.7fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-white">{item.title}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {item.subtitle || "-"}
                </p>
              </div>

              <p className="text-sm font-semibold text-zinc-300">
                {statusLabel(item.status)}
              </p>

              <p className="text-sm font-semibold text-emerald-300">
                {item.amount || "-"}
              </p>

              <p className="text-sm text-zinc-400">
                {formatDate(item.createdAt)}
              </p>

              <div className="flex md:justify-end">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                  >
                    Oeffnen
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-600">-</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const focusMissingData = resolvedSearchParams.action === "missing-data";

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

  const openInvoices = customer.invoices.filter((invoice) =>
    isOpenInvoiceStatus(invoice.status),
  ).length;

  const overdueInvoices = customer.invoices.filter((invoice) =>
    isInvoiceOverdue(invoice),
  ).length;

  const activeOrders = customer.orders.filter((order) => {
    const status = String(order.status || "").toUpperCase();

    return status !== "COMPLETED" && status !== "CANCELLED";
  }).length;

  const completedOrdersWithoutInvoice = customer.orders.filter((order) => {
    const status = String(order.status || "").toUpperCase();

    if (status !== "COMPLETED") {
      return false;
    }

    return !customer.invoices.some((invoice) => invoice.orderId === order.id);
  }).length;

  const payments = customer.invoices.flatMap((invoice) =>
    invoice.payments.map((payment) => ({
      ...payment,
      invoiceNumber: invoice.invoiceNumber,
      invoiceId: invoice.id,
    })),
  );

  const estimatesNeedPhotos = customer.estimates.some(
    (estimate) => estimate.status === "NEEDS_PHOTOS",
  );

  const estimatesNeedReview = customer.estimates.some(
    (estimate) =>
      estimate.status === "AI_REVIEW" ||
      estimate.status === "NEEDS_HUMAN_REVIEW",
  );

  const estimatesReady = customer.estimates.some(
    (estimate) => estimate.status === "READY_TO_SEND",
  );

  const quotesDraft = customer.quotes.filter(
    (quote) => quote.status === "DRAFT",
  ).length;

  const quotesSent = customer.quotes.filter(
    (quote) => quote.status === "SENT",
  ).length;

  const quotesAccepted = customer.quotes.filter(
    (quote) => quote.status === "ACCEPTED",
  ).length;

  const nextAction = getCustomerDetailAction({
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
    street: customer.street,
    zipCode: customer.zipCode,
    city: customer.city,
    notes: customer.notes,
    messagesCount: customer.messages.length,
    estimatesNeedPhotos,
    estimatesNeedReview,
    estimatesReady,
    quotesDraft,
    quotesSent,
    quotesAccepted,
    openInvoices,
    overdueInvoices,
    activeOrders,
    completedOrdersWithoutInvoice,
  });

  const missingItems = buildCustomerMissingItems({
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
    street: customer.street,
    zipCode: customer.zipCode,
    city: customer.city,
    notes: customer.notes,
    messagesCount: customer.messages.length,
    estimatesNeedPhotos,
  });

  const orderItems: TimelineItem[] = customer.orders.map((order) => ({
    id: order.id,
    title: order.orderNumber,
    subtitle: order.title || order.description || order.serviceType || "Auftrag",
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

  const quoteItems: TimelineItem[] = customer.quotes.map((quote) => ({
    id: quote.id,
    title: quote.quoteNumber,
    subtitle: quote.notes || "Offerte",
    status: quote.status,
    amount: formatMoney(quote.total, quote.currency),
    createdAt: quote.createdAt,
    href: `/dashboard/quotes/${quote.id}`,
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

  const attachmentItems: TimelineItem[] = customer.attachments.map((attachment) => ({
    id: attachment.id,
    title: attachment.fileName,
    subtitle: attachment.type || attachment.url,
    status: attachment.type,
    createdAt: attachment.createdAt,
    href: `/dashboard/attachments/${attachment.id}`,
  }));

  const sessionItems: TimelineItem[] = customer.sessions.map((session) => ({
    id: session.id,
    title: session.source || "Kontaktquelle",
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

  const notificationItems: TimelineItem[] = customer.notifications.map(
    (notification) => ({
      id: notification.id,
      title: notification.subject || notification.recipient,
      subtitle: notification.message,
      status: notification.status,
      createdAt: notification.createdAt,
      href: `/dashboard/notifications/${notification.id}`,
    }),
  );

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
      <section className="mx-auto flex w-full max-w-none flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/customers"
              className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              Zurueck zu den Kunden
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS CRM / Kunde
            </p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-white">
              {name}
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
              Ein Kunde ist der zentrale Kontext. Arbeit selbst passiert im
              passenden Modul: Kalkulation, Offerte, Auftrag, Rechnung oder
              Zahlung.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionLink
              href={`/dashboard/customers/${customer.id}/edit`}
              label="Kunde bearbeiten"
              variant="primary"
            />
            <ActionLink href="/dashboard/customers" label="Kundenliste" />
          </div>
        </div>

        <RecordActionPanel action={nextAction} />

        <MissingChecklist
          customerId={customer.id}
          customerEmail={customer.email}
          customerPhone={customer.phone}
          customerNameValue={name}
          items={missingItems}
          focus={focusMissingData}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Kundentyp" value={statusLabel(customer.type)} tone="cyan" />
          <InfoCard label="Aktive Auftraege" value={activeOrders} />
          <InfoCard label="Offene Rechnungen" value={openInvoices} tone={openInvoices > 0 ? "amber" : "green"} />
          <InfoCard label="Offen" value={formatMoney(Math.max(invoicesTotal - invoicesPaid, 0), "CHF")} tone={invoicesTotal - invoicesPaid > 0 ? "red" : "green"} />
        </section>

        <section
          id="kundendaten"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Kundendaten</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Kontakt- und Adressdaten dieses Kunden.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {customer.email ? (
                <ActionLink href={`mailto:${customer.email}`} label="E-Mail" />
              ) : null}

              {customer.phone ? (
                <ActionLink href={`tel:${customer.phone}`} label="Telefon" />
              ) : null}

              <ActionLink
                href={`/dashboard/customers/${customer.id}/edit`}
                label="Bearbeiten"
                variant="primary"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <InfoCard label="Name" value={name} />
            <InfoCard label="Firma" value={customer.companyName} />
            <InfoCard
              label="Person"
              value={[customer.firstName, customer.lastName].filter(Boolean).join(" ")}
            />
            <InfoCard label="E-Mail" value={customer.email} />
            <InfoCard label="Telefon" value={customer.phone} />
            <InfoCard label="Adresse" value={address} />
            <InfoCard label="Notizen" value={customer.notes} />
            <InfoCard label="Erstellt" value={customer.createdAt} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Auftraege" value={customer.orders.length} />
          <InfoCard label="Kalkulationen" value={customer.estimates.length} />
          <InfoCard label="Offerten" value={customer.quotes.length} />
          <InfoCard label="Rechnungen total" value={formatMoney(invoicesTotal, "CHF")} tone="cyan" />
        </section>

        <CustomerListSection
          id="auftraege"
          title="Auftraege dieses Kunden"
          description="Nur Auftraege, die direkt mit diesem Kunden verbunden sind."
          items={orderItems}
        />

        <CustomerListSection
          id="kalkulationen"
          title="Kalkulationen dieses Kunden"
          description="Nur Kalkulationen, die direkt mit diesem Kunden verbunden sind. Bearbeitung passiert im Kalkulationsmodul."
          items={estimateItems}
        />

        <CustomerListSection
          id="offerten"
          title="Offerten dieses Kunden"
          description="Nur Offerten und Angebotsstatus dieses Kunden. Versand, Link und Antwort passieren im Offertenmodul."
          items={quoteItems}
        />

        <CustomerListSection
          id="rechnungen"
          title="Rechnungen dieses Kunden"
          description="Nur Rechnungen, die fuer diesen Kunden erstellt wurden. Zahlung und Mahnung passieren im Rechnungsmodul."
          items={invoiceItems}
        />

        <CustomerListSection
          id="zahlungen"
          title="Zahlungen dieses Kunden"
          description="Nur Zahlungen aus Rechnungen dieses Kunden."
          items={paymentItems}
        />

        <CustomerListSection
          id="dateien"
          title="Uploads und Dateien dieses Kunden"
          description="Fotos, PDFs und Dokumente, die diesem Kunden zugeordnet sind."
          items={attachmentItems}
        />

        <CustomerListSection
          title="Kontaktverlauf"
          description="Sessions, Nachrichten und Benachrichtigungen dieses Kunden."
          items={[...sessionItems, ...messageItems, ...notificationItems]}
        />

        <details className="rounded-3xl border border-amber-400/15 bg-amber-400/[0.03] p-5">
          <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.22em] text-amber-100">
            System / Technik fuer diesen Kunden
          </summary>

          <div className="mt-5">
            <CustomerListSection
              title="Audit Logs dieses Kunden"
              description="Technische Historie nur fuer diesen Kundendatensatz."
              items={auditItems}
            />
          </div>
        </details>
      </section>
    </main>
  );
}