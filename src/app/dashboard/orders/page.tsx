"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DashboardTable, {
  type DashboardTableColumn,
} from "../../../components/dashboard/DashboardTable";
import EmptyState from "../../../components/dashboard/EmptyState";
import MetricCard from "../../../components/dashboard/MetricCard";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../components/dashboard/StatusBadge";

type OrderCustomer = {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type OrderEstimate = {
  id: string;
  estimateNumber?: string | null;
  status?: string | null;
  source?: string | null;
  total?: string | number | null;
  currency?: string | null;
  createdAt?: string | null;
};

type Order = {
  id: string;
  customerId?: string | null;
  sessionId?: string | null;
  customer?: OrderCustomer | null;
  estimates?: OrderEstimate[];
  orderNumber?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  serviceType?: string | null;
  service?: string | null;
  city?: string | null;
  address?: string | null;
  street?: string | null;
  zipCode?: string | null;
  currency?: string | null;
  total?: string | number | null;
  estimatedTotal?: string | number | null;
  estimatedPrice?: string | number | null;
  finalPrice?: string | number | null;
  scheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardOrdersResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    orders: Order[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return "kein Datum";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
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

function getOrderTitle(order: Order) {
  return (
    order.orderNumber ??
    order.title ??
    order.serviceType ??
    order.service ??
    order.id
  );
}

function getOrderService(order: Order) {
  return order.serviceType ?? order.service ?? order.title ?? "—";
}

function getOrderLocation(order: Order) {
  const street = order.street || order.address;
  const cityLine = [order.zipCode, order.city].filter(Boolean).join(" ");

  return [street, cityLine].filter(Boolean).join(", ") || "—";
}

function getOrderAmount(order: Order) {
  return (
    order.finalPrice ??
    order.total ??
    order.estimatedPrice ??
    order.estimatedTotal ??
    null
  );
}

function formatAmount(
  value: string | number | null | undefined,
  currency?: string | null,
) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  if (Number.isNaN(numberValue)) {
    return `${String(value)} ${normalizeCurrency(currency)}`;
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function normalizeStatus(status?: string | null) {
  return status?.toUpperCase() ?? "UNKNOWN";
}

function getCustomerName(order: Order) {
  const customer = order.customer;

  if (!customer) return "Kein Kunde";

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.companyName ||
    fullName ||
    customer.email ||
    customer.phone ||
    "Kein Name"
  );
}

function getCustomerHref(order: Order) {
  const id = order.customer?.id || order.customerId;

  return id ? `/dashboard/customers/${id}` : null;
}

function getLatestEstimate(order: Order) {
  const estimates = Array.isArray(order.estimates) ? order.estimates : [];

  return estimates[0] ?? null;
}

function isQuickOfferOrder(order: Order) {
  const title = String(order.title ?? "").toUpperCase();
  const description = String(order.description ?? "").toUpperCase();
  const estimateSource = getLatestEstimate(order)?.source?.toUpperCase();

  return (
    title.includes("QUICKOFFER") ||
    description.includes("QUICKOFFER") ||
    estimateSource === "QUICK_OFFER"
  );
}

function isChatbotOrder(order: Order) {
  const title = String(order.title ?? "").toUpperCase();
  const description = String(order.description ?? "").toUpperCase();
  const estimateSource = getLatestEstimate(order)?.source?.toUpperCase();

  return (
    title.includes("AI CHATBOX") ||
    title.includes("CHATBOT") ||
    description.includes("AI CHATBOX") ||
    description.includes("CHATBOT") ||
    estimateSource === "CHATBOT"
  );
}

function isPublicLeadOrder(order: Order) {
  return isQuickOfferOrder(order) || isChatbotOrder(order);
}

function needsPublicLeadReview(order: Order) {
  const latestEstimate = getLatestEstimate(order);
  const orderStatus = normalizeStatus(order.status);
  const estimateStatus = normalizeStatus(latestEstimate?.status);

  return (
    isPublicLeadOrder(order) &&
    (orderStatus === "NEW" ||
      orderStatus === "OPEN" ||
      orderStatus === "PENDING" ||
      estimateStatus === "AI_REVIEW" ||
      estimateStatus === "NEEDS_HUMAN_REVIEW")
  );
}

function sourceLabel(order: Order) {
  if (isQuickOfferOrder(order)) {
    return "QuickOffer";
  }

  if (isChatbotOrder(order)) {
    return "Chatbot";
  }

  if (order.sessionId) {
    return "Session";
  }

  return "Dashboard";
}

function sourceBadgeClass(order: Order) {
  if (isQuickOfferOrder(order)) {
    return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  }

  if (isChatbotOrder(order)) {
    return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  }

  if (order.sessionId) {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-200";
}

function leadPanelClass(order: Order) {
  if (isQuickOfferOrder(order)) {
    return "rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-5";
  }

  if (isChatbotOrder(order)) {
    return "rounded-3xl border border-violet-300/20 bg-violet-300/10 p-5";
  }

  return "rounded-3xl border border-white/10 bg-white/[0.04] p-5";
}

function leadLabel(order: Order) {
  if (isQuickOfferOrder(order)) {
    return "QuickOffer Lead";
  }

  if (isChatbotOrder(order)) {
    return "Chatbot Lead";
  }

  return "Website Lead";
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/orders", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Die Auftrags-API hat einen Fehler zurückgegeben.");
      }

      const json: DashboardOrdersResponse = await response.json();

      setOrders(json.data.orders ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unbekannter Auftragsfehler.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrders]);

  const stats = useMemo(() => {
    const completed = orders.filter(
      (order) => normalizeStatus(order.status) === "COMPLETED",
    ).length;

    const open = orders.filter((order) =>
      [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "PENDING",
        "WAITING_FOR_CUSTOMER",
        "SCHEDULED",
      ].includes(normalizeStatus(order.status)),
    ).length;

    const quoted = orders.filter((order) =>
      ["QUOTE_CREATED", "SENT", "ACCEPTED", "CONFIRMED"].includes(
        normalizeStatus(order.status),
      ),
    ).length;

    const quickOffer = orders.filter(isQuickOfferOrder).length;
    const chatbot = orders.filter(isChatbotOrder).length;
    const publicLeadReview = orders.filter(needsPublicLeadReview).length;

    const estimatedValue = orders.reduce((sum, order) => {
      const amount = getOrderAmount(order);

      if (amount === null || amount === undefined || amount === "") {
        return sum;
      }

      const numberValue =
        typeof amount === "number"
          ? amount
          : Number(String(amount).replace(",", "."));

      return Number.isNaN(numberValue) ? sum : sum + numberValue;
    }, 0);

    return {
      total: orders.length,
      open,
      completed,
      quoted,
      quickOffer,
      chatbot,
      publicLeadReview,
      estimatedValue,
    };
  }, [orders]);

  const columns: DashboardTableColumn<Order>[] = [
    {
      key: "order",
      header: "Auftrag",
      render: (order) => {
        const quickOffer = isQuickOfferOrder(order);
        const chatbot = isChatbotOrder(order);
        const publicLead = isPublicLeadOrder(order);

        return (
          <div>
            <p className="font-black tracking-tight text-white">
              {getOrderTitle(order)}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {quickOffer ? (
                <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 py-1 text-[11px] font-bold text-fuchsia-100">
                  QuickOffer Lead
                </span>
              ) : null}

              {chatbot ? (
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-[11px] font-bold text-violet-100">
                  Chatbot Lead
                </span>
              ) : null}

              {publicLead && needsPublicLeadReview(order) ? (
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-100">
                  Prüfung erforderlich
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-zinc-500">ID: {order.id}</p>

            {order.description ? (
              <p className="mt-1 max-w-sm truncate text-xs text-zinc-500">
                {order.description}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "source",
      header: "Quelle",
      render: (order) => (
        <div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceBadgeClass(
              order,
            )}`}
          >
            {sourceLabel(order)}
          </span>

          {order.sessionId ? (
            <p className="mt-2 max-w-[160px] truncate text-xs text-zinc-500">
              Session: {order.sessionId}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "customer",
      header: "Kunde",
      render: (order) => {
        const href = getCustomerHref(order);

        return href ? (
          <PremiumButton href={href} variant="ghost" size="sm">
            {getCustomerName(order)}
          </PremiumButton>
        ) : (
          <p className="text-sm text-zinc-500">{getCustomerName(order)}</p>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "service",
      header: "Leistung",
      render: (order) => (
        <p className="font-semibold text-zinc-200">{getOrderService(order)}</p>
      ),
    },
    {
      key: "estimate",
      header: "Kalkulation",
      render: (order) => {
        const latestEstimate = getLatestEstimate(order);

        if (!latestEstimate) {
          return <p className="text-sm text-zinc-500">Keine Kalkulation</p>;
        }

        return (
          <div>
            <PremiumButton
              href={`/dashboard/estimates/${latestEstimate.id}`}
              variant={isPublicLeadOrder(order) ? "secondary" : "ghost"}
              size="sm"
            >
              {latestEstimate.estimateNumber ?? "Kalkulation öffnen"}
            </PremiumButton>

            <p className="mt-2 text-xs text-zinc-500">
              {latestEstimate.status ?? "—"} ·{" "}
              {formatAmount(
                latestEstimate.total,
                latestEstimate.currency ?? order.currency,
              )}
            </p>
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Ort",
      render: (order) => (
        <p className="max-w-xs text-zinc-400">{getOrderLocation(order)}</p>
      ),
    },
    {
      key: "amount",
      header: "Betrag",
      render: (order) => (
        <p className="font-black text-emerald-100">
          {formatAmount(getOrderAmount(order), order.currency)}
        </p>
      ),
    },
    {
      key: "created",
      header: "Erstellt",
      render: (order) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(order.createdAt)}
        </p>
      ),
    },
    {
      key: "action",
      header: "Aktionen",
      className: "text-right",
      render: (order) => {
        const latestEstimate = getLatestEstimate(order);
        const publicLead = isPublicLeadOrder(order);

        return (
          <div className="flex flex-wrap justify-end gap-2">
            <PremiumButton
              href={`/dashboard/orders/${order.id}`}
              variant="primary"
              size="sm"
            >
              {publicLead ? "Lead öffnen" : "Details"}
            </PremiumButton>

            <PremiumButton
              href={`/dashboard/orders/${order.id}/edit`}
              variant="secondary"
              size="sm"
            >
              Bearbeiten
            </PremiumButton>

            {latestEstimate ? (
              <PremiumButton
                href={`/dashboard/estimates/${latestEstimate.id}`}
                variant="secondary"
                size="sm"
              >
                {publicLead ? "Lead prüfen" : "Kalkulation"}
              </PremiumButton>
            ) : (
              <PremiumButton
                href={`/dashboard/estimates?orderId=${order.id}`}
                variant="secondary"
                size="sm"
              >
                Kalkulationen
              </PremiumButton>
            )}

            <PremiumButton
              href={`/dashboard/invoices?orderId=${order.id}`}
              variant="ghost"
              size="sm"
            >
              Rechnungen
            </PremiumButton>
          </div>
        );
      },
    },
  ];

  const ordersForReview = orders.filter(needsPublicLeadReview);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Aufträge"
          title="Operative Aufträge"
          description="Zentrales Arbeitscenter für Kundenaufträge: Status, Orte, Beträge, Workflow und der Übergang zu Kunden, Kalkulationen, Rechnungen und Zahlungen. QuickOffer- und Chatbot-Leads aus der Website werden hier direkt als neue Aufträge sichtbar."
        >
          <PremiumButton href="/dashboard/orders/new" variant="primary">
            Auftrag erstellen
          </PremiumButton>

          <PremiumButton type="button" variant="secondary" onClick={loadOrders}>
            Aktualisieren
          </PremiumButton>

          <PremiumButton href="/dashboard/customers" variant="ghost">
            Kunden
          </PremiumButton>

          <PremiumButton href="/dashboard/invoices" variant="ghost">
            Rechnungen
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Alle Aufträge"
            value={String(stats.total)}
            description="Gesamtzahl der Datensätze im Auftragsmodul."
            trend="Quelle: Auftrags-API"
            tone="cyan"
            icon={<span className="text-lg font-black">JOB</span>}
          />

          <MetricCard
            title="Aktiv"
            value={String(stats.open)}
            description="Neue, offene, laufende oder wartende Aufträge."
            trend="Zur Bearbeitung"
            tone="amber"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="QuickOffer"
            value={String(stats.quickOffer)}
            description="Website-Leads aus dem QuickOffer Formular."
            trend="Public Website"
            tone="violet"
            icon={<span className="text-lg font-black">QO</span>}
          />

          <MetricCard
            title="Chatbot"
            value={String(stats.chatbot)}
            description="Website-Leads aus dem AI Chatbox Workflow."
            trend="Public Website"
            tone="cyan"
            icon={<span className="text-lg font-black">AI</span>}
          />

          <MetricCard
            title="Do kontroli"
            value={String(stats.publicLeadReview)}
            description="Public-Leads, die noch geprüft werden müssen."
            trend="Vor Versand prüfen"
            tone="amber"
            icon={<span className="text-lg font-black">!</span>}
          />

          <MetricCard
            title="Wert"
            value={formatAmount(stats.estimatedValue)}
            description="Summe der bekannten Auftragsbeträge."
            trend={`${stats.quoted} nach Kalkulation / Bestätigung`}
            tone="violet"
            icon={<span className="text-lg font-black">CHF</span>}
          />
        </section>

        {ordersForReview.length > 0 ? (
          <DashboardPanel
            title="Website-Leads warten auf Prüfung"
            description="Diese Aufträge wurden automatisch aus QuickOffer oder AI Chatbox erstellt. Vor einem offiziellen Angebot müssen Umfang, Risiko, Preis, Fotos und Kundendaten geprüft werden."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ordersForReview.map((order) => {
                const latestEstimate = getLatestEstimate(order);

                return (
                  <div key={order.id} className={leadPanelClass(order)}>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                      {leadLabel(order)}
                    </p>

                    <p className="mt-2 text-lg font-black text-white">
                      {order.orderNumber ?? order.title ?? order.id}
                    </p>

                    <p className="mt-2 text-sm text-zinc-300">
                      {getCustomerName(order)}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {formatAmount(getOrderAmount(order), order.currency)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <PremiumButton
                        href={`/dashboard/orders/${order.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Auftrag öffnen
                      </PremiumButton>

                      {latestEstimate ? (
                        <PremiumButton
                          href={`/dashboard/estimates/${latestEstimate.id}`}
                          variant="secondary"
                          size="sm"
                        >
                          Lead prüfen
                        </PremiumButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </DashboardPanel>
        ) : null}

        {loading ? (
          <DashboardPanel
            title="Aufträge werden geladen"
            description="HEXA OS lädt die aktuellen Daten aus dem Auftragsmodul."
          >
            <div className="grid gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </DashboardPanel>
        ) : null}

        {errorMessage ? (
          <DashboardPanel
            title="Fehler im Auftragsmodul"
            description="Die Auftragsliste konnte nicht aus der API geladen werden."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Fehler: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Prüfen Sie den Endpoint /api/dashboard/orders und die
                Datenbankverbindung.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Auftragsliste"
            description={`Anzahl Datensätze: ${orders.length}. QuickOffer- und Chatbot-Leads sind markiert und können direkt über Auftrag oder Kalkulation geprüft werden.`}
            action={
              <StatusBadge
                status={orders.length > 0 ? "ACCEPTED" : "PENDING"}
                label={orders.length > 0 ? "Daten aktiv" : "Keine Daten"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={orders}
              getRowKey={(order) => order.id}
              empty={
                <EmptyState
                  title="Keine Aufträge in der Datenbank"
                  description="Erstellen Sie einen Auftrag manuell oder senden Sie testweise eine Anfrage über QuickOffer oder Chatbot auf der Website."
                  actionLabel="Auftrag erstellen"
                  actionHref="/dashboard/orders/new"
                />
              }
            />
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}