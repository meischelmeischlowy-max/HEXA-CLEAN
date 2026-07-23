import Link from "next/link";
import {
  EstimateStatus,
  InvoiceStatus,
  NotificationStatus,
  OrderStatus,
  PrismaClient,
  QuoteStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type AlertPriority = "P1" | "P2" | "P3";
type AlertTone = "red" | "amber" | "cyan" | "green" | "neutral";

type AutomationAlert = {
  id: string;
  type: string;
  priority: AlertPriority;
  tone: AlertTone;
  title: string;
  description: string;
  href: string;
  primaryLabel: string;
  customer: string;
  amount?: string;
  meta: string[];
  createdAt: Date;
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
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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

function formatMoney(value: unknown, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";

  return value.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email?: string | null;
  phone?: string | null;
} | null) {
  if (!customer) return "Kein Kunde";

  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "Kein Kunde";
}

function sourceLabel(source: string | null | undefined) {
  if (source === "QUICK_OFFER") return "QuickOffer Website";
  if (source === "CHATBOT") return "AI Chatbox";
  if (source === "ADMIN") return "Dashboard";
  if (source === "PUBLIC_FORM") return "Public Form";

  return source || "Unbekannte Quelle";
}

function notificationFailureDescription(
  errorMessage: string | null | undefined,
) {
  const raw = String(
    errorMessage || "",
  ).trim();

  if (!raw) {
    return "Der E-Mail-Versand ist fehlgeschlagen. Öffnen Sie den Datensatz und prüfen Sie die Versanddetails.";
  }

  if (
    raw.includes('"statusCode":403') ||
    raw.includes("You can only send testing emails") ||
    raw.includes("verify a domain")
  ) {
    return "Die Absender-Domain ist in Resend noch nicht verifiziert. Deshalb kann das System aktuell nur Test-E-Mails an die eigene Konto-Adresse senden.";
  }

  try {
    const parsed = JSON.parse(raw) as {
      statusCode?: unknown;
    };

    const status =
      typeof parsed.statusCode === "number"
        ? ` (HTTP ${parsed.statusCode})`
        : "";

    return `Der Versanddienst hat die Nachricht abgelehnt${status}. Technische Details stehen im Benachrichtigungsdatensatz.`;
  } catch {
    return raw.length > 220
      ? `${raw.slice(0, 217)}...`
      : raw;
  }
}

function priorityWeight(priority: AlertPriority) {
  if (priority === "P1") return 1;
  if (priority === "P2") return 2;
  return 3;
}

function toneCardClass(tone: AlertTone) {
  if (tone === "red") {
    return "border-red-300/25 bg-red-300/10 text-red-100";
  }

  if (tone === "amber") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "cyan") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  if (tone === "green") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-100";
}

function toneButtonClass(tone: AlertTone) {
  if (tone === "red") {
    return "border-red-300/30 bg-red-300/15 text-red-50 hover:bg-red-300/25";
  }

  if (tone === "amber") {
    return "border-amber-300/30 bg-amber-300/15 text-amber-50 hover:bg-amber-300/25";
  }

  if (tone === "cyan") {
    return "border-cyan-300/30 bg-cyan-300/15 text-cyan-50 hover:bg-cyan-300/25";
  }

  if (tone === "green") {
    return "border-emerald-300/30 bg-emerald-300/15 text-emerald-50 hover:bg-emerald-300/25";
  }

  return "border-white/10 bg-white/[0.05] text-white hover:bg-white/10";
}

function priorityClass(priority: AlertPriority) {
  if (priority === "P1") {
    return "border-red-300/40 bg-red-300/15 text-red-100";
  }

  if (priority === "P2") {
    return "border-amber-300/40 bg-amber-300/15 text-amber-100";
  }

  return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
}

function StatCard({
  label,
  value,
  tone,
  description,
}: {
  label: string;
  value: number;
  tone: AlertTone;
  description: string;
}) {
  return (
    <div className={`rounded-3xl border p-5 ${toneCardClass(tone)}`}>
      <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black">{value}</p>
      <p className="mt-2 text-sm leading-6 opacity-70">{description}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: AutomationAlert }) {
  return (
    <article className={`rounded-3xl border p-5 ${toneCardClass(alert.tone)}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(
                alert.priority,
              )}`}
            >
              {alert.priority}
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
              {alert.type}
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/80">
              {formatDate(alert.createdAt)}
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-white">
            {alert.title}
          </h2>

          <p className="mt-2 max-w-3xl break-words text-sm leading-6 opacity-80">
            {alert.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white">
              {alert.customer}
            </span>

            {alert.amount ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white">
                {alert.amount}
              </span>
            ) : null}

            {alert.meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/75"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <Link
          href={alert.href}
          className={`shrink-0 rounded-2xl border px-5 py-3 text-center text-sm font-black transition ${toneButtonClass(
            alert.tone,
          )}`}
        >
          {alert.primaryLabel}
        </Link>
      </div>
    </article>
  );
}

function PrimaryAlertCard({
  alert,
  totalAlerts,
}: {
  alert: AutomationAlert;
  totalAlerts: number;
}) {
  return (
    <section
      className={`rounded-3xl border p-4 shadow-xl shadow-black/20 sm:p-5 ${toneCardClass(
        alert.tone,
      )}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${priorityClass(
                alert.priority,
              )}`}
            >
              {alert.priority}
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
              Heute zuerst
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/75">
              {totalAlerts} Aufgabe
              {totalAlerts === 1 ? "" : "n"} offen
            </span>
          </div>

          <p className="mt-3.5 text-xs font-black uppercase tracking-[0.22em] text-white/60">
            {alert.type}
          </p>

          <h2 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {alert.title}
          </h2>

          <p className="mt-2 max-w-3xl break-words text-sm leading-5 text-white/75">
            {alert.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white">
              {alert.customer}
            </span>

            {alert.amount ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white">
                {alert.amount}
              </span>
            ) : null}

            {alert.meta.slice(0, 2).map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-white/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <Link
          data-testid="dashboard-primary-action"
          href={alert.href}
          className={`w-full shrink-0 rounded-2xl border px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] transition sm:w-auto ${toneButtonClass(
            alert.tone,
          )}`}
        >
          {alert.primaryLabel}
        </Link>
      </div>
    </section>
  );
}

function EmptyInbox() {
  return (
    <section className="rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-8 text-emerald-100">
      <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">
        Automation Inbox
      </p>
      <h2 className="mt-3 text-3xl font-black text-white">
        Keine dringenden Aktionen
      </h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 opacity-80">
        Im Moment gibt es keine kritischen E-Mail-Fehler, keine neuen
        Kalkulationen mit Prüfung, keine fehlenden Fotos und keine sofortigen
        Rechnungs- oder Zahlungsaktionen.
      </p>
    </section>
  );
}

export default async function DashboardCockpitPage() {
  const prisma = getPrisma();
  const now = new Date();

  const [
    reviewEstimates,
    photoEstimates,
    readyEstimates,
    sentEstimates,
    acceptedEstimates,
    failedNotifications,
    pendingNotifications,
    acceptedQuotes,
    completedOrdersWithoutInvoice,
    overdueInvoices,
    reviewCount,
    photoCount,
    readyCount,
    sentCount,
    failedNotificationCount,
    pendingNotificationCount,
    acceptedQuoteCount,
    completedOrdersWithoutInvoiceCount,
    overdueInvoiceCount,
  ] = await Promise.all([
    prisma.estimate.findMany({
      where: {
        status: {
          in: [EstimateStatus.AI_REVIEW, EstimateStatus.NEEDS_HUMAN_REVIEW],
        },
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    prisma.estimate.findMany({
      where: {
        status: EstimateStatus.NEEDS_PHOTOS,
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    prisma.estimate.findMany({
      where: {
        status: EstimateStatus.READY_TO_SEND,
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),

    prisma.estimate.findMany({
      where: {
        status: EstimateStatus.SENT,
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),

    prisma.estimate.findMany({
      where: {
        status: EstimateStatus.ACCEPTED,
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),

    prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
      },
      include: {
        customer: true,
        estimate: true,
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
      },
      include: {
        customer: true,
        estimate: true,
        order: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),

    prisma.quote.findMany({
      where: {
        status: QuoteStatus.ACCEPTED,
        invoice: {
          is: null,
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),

    prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        invoices: {
          none: {},
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),

    prisma.invoice.findMany({
      where: {
        OR: [
          {
            status: InvoiceStatus.OVERDUE,
          },
          {
            dueDate: {
              lt: now,
            },
            status: {
              in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
            },
          },
        ],
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 8,
    }),

    prisma.estimate.count({
      where: {
        status: {
          in: [EstimateStatus.AI_REVIEW, EstimateStatus.NEEDS_HUMAN_REVIEW],
        },
      },
    }),

    prisma.estimate.count({
      where: {
        status: EstimateStatus.NEEDS_PHOTOS,
      },
    }),

    prisma.estimate.count({
      where: {
        status: EstimateStatus.READY_TO_SEND,
      },
    }),

    prisma.estimate.count({
      where: {
        status: EstimateStatus.SENT,
      },
    }),

    prisma.notification.count({
      where: {
        status: NotificationStatus.FAILED,
      },
    }),

    prisma.notification.count({
      where: {
        status: NotificationStatus.PENDING,
      },
    }),

    prisma.quote.count({
      where: {
        status: QuoteStatus.ACCEPTED,
        invoice: {
          is: null,
        },
      },
    }),

    prisma.order.count({
      where: {
        status: OrderStatus.COMPLETED,
        invoices: {
          none: {},
        },
      },
    }),

    prisma.invoice.count({
      where: {
        OR: [
          {
            status: InvoiceStatus.OVERDUE,
          },
          {
            dueDate: {
              lt: now,
            },
            status: {
              in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
            },
          },
        ],
      },
    }),
  ]);

  const alerts: AutomationAlert[] = [
    ...failedNotifications.map((notification) => ({
      id: `notification-failed-${notification.id}`,
      type: "E-Mail Fehler",
      priority: "P1" as const,
      tone: "red" as const,
      title: "E-Mail Versand fehlgeschlagen",
      description: notificationFailureDescription(
        notification.errorMessage,
      ),
      href: `/dashboard/notifications/${notification.id}`,
      primaryLabel: "Fehler prüfen",
      customer: customerName(notification.customer),
      meta: [
        notification.recipient,
        notification.subject || "Ohne Betreff",
        notification.estimate?.estimateNumber || notification.order?.orderNumber || "CRM",
      ].filter(Boolean),
      createdAt: notification.createdAt,
    })),

    ...reviewEstimates.map((estimate) => ({
      id: `estimate-review-${estimate.id}`,
      type: sourceLabel(estimate.source),
      priority: "P1" as const,
      tone: "amber" as const,
      title: "Kalkulation intern prüfen",
      description:
        "Neue Anfrage oder KI-Kalkulation wartet auf Kontrolle. Erst nach Prüfung darf daraus eine Offerte entstehen.",
      href: `/dashboard/estimates/${estimate.id}`,
      primaryLabel: "Prüfung starten",
      customer: customerName(estimate.customer),
      amount: formatMoney(estimate.total, estimate.currency),
      meta: [
        estimate.estimateNumber,
        estimate.status,
        estimate.order?.orderNumber || "Kein Auftrag",
      ],
      createdAt: estimate.createdAt,
    })),

    ...photoEstimates.map((estimate) => ({
      id: `estimate-photos-${estimate.id}`,
      type: "Fotos / Uploads",
      priority: "P1" as const,
      tone: "amber" as const,
      title: "Fotos oder Details fehlen",
      description:
        "Diese Kalkulation kann ohne weitere Informationen nicht sauber freigegeben werden. Kunde braucht Rückfrage oder Upload-Anforderung.",
      href: `/dashboard/estimates/${estimate.id}`,
      primaryLabel: "Fotos prüfen",
      customer: customerName(estimate.customer),
      amount: formatMoney(estimate.total, estimate.currency),
      meta: [estimate.estimateNumber, estimate.status],
      createdAt: estimate.updatedAt,
    })),

    ...readyEstimates.map((estimate) => ({
      id: `estimate-ready-${estimate.id}`,
      type: "Offerte vorbereiten",
      priority: "P2" as const,
      tone: "cyan" as const,
      title: "Kalkulation ist freigegeben",
      description:
        "Die interne Prüfung ist erledigt. Nächster Schritt: Offerte erstellen, prüfen und dann sauber senden.",
      href: `/dashboard/estimates/${estimate.id}`,
      primaryLabel: "Offerte vorbereiten",
      customer: customerName(estimate.customer),
      amount: formatMoney(estimate.total, estimate.currency),
      meta: [estimate.estimateNumber, estimate.status],
      createdAt: estimate.updatedAt,
    })),

    ...sentEstimates.map((estimate) => ({
      id: `estimate-sent-${estimate.id}`,
      type: "Kundenantwort",
      priority: "P3" as const,
      tone: "cyan" as const,
      title: "Offerte wartet auf Kunde",
      description:
        "Die Offerte oder Nachricht wurde als versendet markiert. Kundenantwort, Link, E-Mail oder Rückfrage verfolgen.",
      href: `/dashboard/estimates/${estimate.id}`,
      primaryLabel: "Antwort verfolgen",
      customer: customerName(estimate.customer),
      amount: formatMoney(estimate.total, estimate.currency),
      meta: [estimate.estimateNumber, estimate.status],
      createdAt: estimate.updatedAt,
    })),

    ...acceptedEstimates.map((estimate) => ({
      id: `estimate-accepted-${estimate.id}`,
      type: "Termin planen",
      priority: "P2" as const,
      tone: "green" as const,
      title: "Kalkulation akzeptiert",
      description:
        "Der Kunde hat zugesagt. Nächster Schritt: Auftrag und Terminplanung prüfen.",
      href: estimate.order?.id
        ? `/dashboard/orders/${estimate.order.id}`
        : `/dashboard/estimates/${estimate.id}`,
      primaryLabel: "Auftrag planen",
      customer: customerName(estimate.customer),
      amount: formatMoney(estimate.total, estimate.currency),
      meta: [
        estimate.estimateNumber,
        estimate.order?.orderNumber || "Auftrag prüfen",
      ],
      createdAt: estimate.updatedAt,
    })),

    ...acceptedQuotes.map((quote) => ({
      id: `quote-accepted-${quote.id}`,
      type: "Akzeptierte Offerte",
      priority: "P2" as const,
      tone: "green" as const,
      title: "Akzeptierte Offerte ohne Rechnung",
      description:
        "Eine Offerte wurde akzeptiert. Auftrag, Termin oder Rechnung müssen als nächster Schritt geprüft werden.",
      href: "/dashboard/quotes",
      primaryLabel: "Offerten prüfen",
      customer: customerName(quote.customer),
      amount: formatMoney(quote.total, quote.currency),
      meta: [quote.quoteNumber, quote.status],
      createdAt: quote.updatedAt,
    })),

    ...completedOrdersWithoutInvoice.map((order) => ({
      id: `order-invoice-missing-${order.id}`,
      type: "Rechnung fehlt",
      priority: "P2" as const,
      tone: "amber" as const,
      title: "Auftrag abgeschlossen, Rechnung fehlt",
      description:
        "Ein Auftrag ist abgeschlossen, aber noch nicht abgerechnet. Rechnung erstellen oder Status prüfen.",
      href: `/dashboard/orders/${order.id}`,
      primaryLabel: "Auftrag prüfen",
      customer: customerName(order.customer),
      amount: order.finalPrice
        ? formatMoney(order.finalPrice, order.currency)
        : order.estimatedPrice
          ? formatMoney(order.estimatedPrice, order.currency)
          : undefined,
      meta: [order.orderNumber, order.status],
      createdAt: order.updatedAt,
    })),

    ...overdueInvoices.map((invoice) => ({
      id: `invoice-overdue-${invoice.id}`,
      type: "Zahlung überfällig",
      priority: "P1" as const,
      tone: "red" as const,
      title: "Rechnung überfällig",
      description:
        "Eine Rechnung ist überfällig oder als OVERDUE markiert. Zahlung, Mahnung oder Status sofort prüfen.",
      href: `/dashboard/invoices/${invoice.id}`,
      primaryLabel: "Rechnung prüfen",
      customer: customerName(invoice.customer),
      amount: formatMoney(invoice.total, invoice.currency),
      meta: [
        invoice.invoiceNumber,
        invoice.status,
        invoice.dueDate ? `Fällig: ${formatDate(invoice.dueDate)}` : "Kein Datum",
      ],
      createdAt: invoice.dueDate ?? invoice.updatedAt,
    })),

    ...pendingNotifications.map((notification) => ({
      id: `notification-pending-${notification.id}`,
      type: "Versand offen",
      priority: "P3" as const,
      tone: "amber" as const,
      title: "Benachrichtigung wartet",
      description:
        "Eine Notification ist noch PENDING. Versand, Retry oder manuelle Rückfrage prüfen.",
      href: `/dashboard/notifications/${notification.id}`,
      primaryLabel: "Notification prüfen",
      customer: customerName(notification.customer),
      meta: [
        notification.recipient,
        notification.subject || "Ohne Betreff",
        notification.estimate?.estimateNumber || notification.order?.orderNumber || "CRM",
      ].filter(Boolean),
      createdAt: notification.createdAt,
    })),
  ].sort((first, second) => {
    const priorityDiff =
      priorityWeight(first.priority) - priorityWeight(second.priority);

    if (priorityDiff !== 0) return priorityDiff;

    return second.createdAt.getTime() - first.createdAt.getTime();
  });

  const p1Count = alerts.filter((alert) => alert.priority === "P1").length;
  const p2Count = alerts.filter((alert) => alert.priority === "P2").length;

  const urgentActionCount =
    reviewCount +
    photoCount +
    failedNotificationCount +
    overdueInvoiceCount;


  const primaryAlert =
    alerts[0] ?? null;

  const remainingAlerts =
    alerts.slice(1, 9);
  return (
    <main className="min-h-screen px-4 py-4 text-white sm:px-6 lg:px-7">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-3.5 shadow-xl shadow-black/20 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                HEXA OS / Arbeitscockpit
              </p>

              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Cockpit
              </h1>

              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-zinc-400">
                Die wichtigste Aufgabe steht direkt darunter. Weitere Vorgänge
                folgen automatisch nach Priorität.
              </p>
            </div>

            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${
                urgentActionCount > 0
                  ? "border-red-300/30 bg-red-300/10 text-red-100"
                  : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  urgentActionCount > 0
                    ? "bg-red-300"
                    : "bg-emerald-300"
                }`}
              />

              {urgentActionCount > 0
                ? `${urgentActionCount} kritisch`
                : "Alles unter Kontrolle"}
            </div>
          </div>
        </header>

        {primaryAlert ? (
          <PrimaryAlertCard
            alert={primaryAlert}
            totalAlerts={alerts.length}
          />
        ) : (
          <EmptyInbox />
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 [&>*]:!p-4">
          <StatCard
            label="P1 kritisch"
            value={p1Count}
            tone={p1Count > 0 ? "red" : "green"}
            description="Sofort bearbeiten."
          />

          <StatCard
            label="P2 wichtig"
            value={p2Count}
            tone={p2Count > 0 ? "amber" : "green"}
            description="Heute einplanen."
          />

          <StatCard
            label="Neue Prüfung"
            value={reviewCount}
            tone={reviewCount > 0 ? "amber" : "neutral"}
            description="AI / interne Kalkulation."
          />

          <StatCard
            label="E-Mail Fehler"
            value={failedNotificationCount}
            tone={failedNotificationCount > 0 ? "red" : "green"}
            description="Resend / SMTP prüfen."
          />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 [&>*]:!p-4">
          <StatCard
            label="Fotos fehlen"
            value={photoCount}
            tone={photoCount > 0 ? "amber" : "neutral"}
            description="Rückfrage / Upload nötig."
          />

          <StatCard
            label="Bereit für Offerte"
            value={readyCount}
            tone={readyCount > 0 ? "cyan" : "neutral"}
            description="Offerte vorbereiten."
          />

          <StatCard
            label="Wartet auf Kunde"
            value={sentCount}
            tone={sentCount > 0 ? "cyan" : "neutral"}
            description="Antwort verfolgen."
          />

          <StatCard
            label="Zahlung / Rechnung"
            value={overdueInvoiceCount + completedOrdersWithoutInvoiceCount}
            tone={
              overdueInvoiceCount > 0
                ? "red"
                : completedOrdersWithoutInvoiceCount > 0
                  ? "amber"
                  : "neutral"
            }
            description="Rechnung oder Zahlung prüfen."
          />
        </section>

        {remainingAlerts.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Heute zuerst
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  Weitere Aufgaben
                </h2>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
                  Reihenfolge nach Dringlichkeit. P1 zuerst, danach P2 und P3.
                  Keine technischen Listen, sondern konkrete nächste Aktionen.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300">
                {remainingAlerts.length} weitere Aufgaben
              </div>
            </div>

            <div className="grid gap-4">
              {remainingAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Kalkulationen
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {reviewCount + photoCount + readyCount + sentCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Offene kalkulationsbezogene Arbeit: Prüfung, Fotos, Offerte oder
              Kundenantwort.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Kommunikation
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {failedNotificationCount + pendingNotificationCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fehlgeschlagene oder wartende Notifications. Technische Fehler
              bleiben sichtbar, bis sie gelöst sind.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              Offerten / Rechnung
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {acceptedQuoteCount +
                completedOrdersWithoutInvoiceCount +
                overdueInvoiceCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Akzeptierte Offerten, abgeschlossene Aufträge ohne Rechnung und
              überfällige Rechnungen.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}