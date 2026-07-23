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

function toneRowClass(tone: AlertTone) {
  if (tone === "red") {
    return "border-red-300/50 bg-red-300/[0.055]";
  }

  if (tone === "amber") {
    return "border-amber-300/50 bg-amber-300/[0.045]";
  }

  if (tone === "cyan") {
    return "border-cyan-300/45 bg-cyan-300/[0.04]";
  }

  if (tone === "green") {
    return "border-emerald-300/45 bg-emerald-300/[0.04]";
  }

  return "border-white/15 bg-white/[0.015]";
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
    <div
      title={description}
      className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 ${toneCardClass(
        tone,
      )}`}
    >
      <p className="min-w-0 text-[10px] font-black uppercase leading-3 tracking-[0.12em] opacity-75">
        {label}
      </p>

      <p className="shrink-0 text-xl font-black leading-none">
        {value}
      </p>
    </div>
  );
}

function AlertCard({
  alert,
  isPrimary = false,
  totalAlerts,
}: {
  alert: AutomationAlert;
  isPrimary?: boolean;
  totalAlerts?: number;
}) {
  return (
    <article
      className={`grid gap-2 border-l-2 px-3 py-2.5 transition hover:bg-white/[0.04] xl:grid-cols-[76px_minmax(180px,0.85fr)_minmax(260px,1.45fr)_150px_auto] xl:items-center ${toneRowClass(
        alert.tone,
      )}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex min-w-10 justify-center rounded-lg border px-2 py-1 text-[11px] font-black ${priorityClass(
            alert.priority,
          )}`}
        >
          {alert.priority}
        </span>

        {isPrimary ? (
          <span
            title="Heute zuerst"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[10px] font-black text-white/70"
          >
            1
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-black text-white">
            {alert.title}
          </h2>

          {isPrimary && totalAlerts ? (
            <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-white/45 2xl:inline">
              {totalAlerts} offen
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 truncate text-xs font-bold text-white/65">
          {alert.customer}
          {alert.amount ? ` · ${alert.amount}` : ""}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs leading-5 text-white/60">
          {alert.description}
        </p>

        <span className="mt-0.5 inline-flex rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/50">
          {alert.type}
        </span>
      </div>

      <div className="hidden min-w-0 text-right text-[11px] leading-4 text-white/45 xl:block">
        {alert.meta.slice(0, 1).map((item) => (
          <p
            key={item}
            className="truncate font-semibold text-white/55"
          >
            {item}
          </p>
        ))}

        <p>{formatDate(alert.createdAt)}</p>
      </div>

      <Link
        data-testid={
          isPrimary
            ? "dashboard-primary-action"
            : undefined
        }
        href={alert.href}
        className={`w-full shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-center text-xs font-black uppercase tracking-[0.08em] transition sm:w-auto ${toneButtonClass(
          alert.tone,
        )}`}
      >
        {alert.primaryLabel}
      </Link>
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
    <AlertCard
      alert={alert}
      isPrimary
      totalAlerts={totalAlerts}
    />
  );
}

function EmptyInbox() {
  return (
    <section className="px-4 py-8 text-center text-emerald-100">
      <p className="text-xs font-black uppercase tracking-[0.22em] opacity-65">
        Automation Inbox
      </p>

      <h2 className="mt-2 text-xl font-black text-white">
        Keine dringenden Aktionen
      </h2>

      <p className="mt-1.5 text-sm text-emerald-100/70">
        Alle automatischen Abläufe sind aktuell unter Kontrolle.
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
    alerts.slice(1, 20);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS / Arbeitsliste
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Cockpit
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 xl:block">
                  Offene Vorgänge nach Priorität. Das System führt automatisch durch die nächsten Schritte.
                </p>
              </div>
            </div>

            <div
              className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                urgentActionCount > 0
                  ? "border-red-300/30 bg-red-300/10 text-red-100"
                  : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
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

        <section
          aria-label="Arbeitsübersicht"
          className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8"
        >
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
            description="AI oder interne Kalkulation."
          />

          <StatCard
            label="E-Mail Fehler"
            value={failedNotificationCount}
            tone={failedNotificationCount > 0 ? "red" : "green"}
            description="Resend oder SMTP prüfen."
          />

          <StatCard
            label="Fotos fehlen"
            value={photoCount}
            tone={photoCount > 0 ? "amber" : "neutral"}
            description="Rückfrage oder Upload nötig."
          />

          <StatCard
            label="Offerte bereit"
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
            value={
              overdueInvoiceCount +
              completedOrdersWithoutInvoiceCount
            }
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

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Offene Vorgänge
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                P1 sofort, danach P2 und P3. Eine Zeile entspricht einem Vorgang.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {alerts.length} offen
            </span>
          </div>

          {primaryAlert ? (
            <div className="divide-y divide-white/10">
              <PrimaryAlertCard
                alert={primaryAlert}
                totalAlerts={alerts.length}
              />

              {remainingAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                />
              ))}
            </div>
          ) : (
            <EmptyInbox />
          )}
        </section>
      </section>
    </main>
  );
}