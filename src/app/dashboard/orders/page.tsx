"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../components/dashboard/StatusBadge";

type OrderCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
};

type OrderEstimate = {
  id: string;
  status?: string | null;
  total?: string | number | null;
  currency?: string | null;
};

type Order = {
  id: string;
  customer?: OrderCustomer | null;
  estimates?: OrderEstimate[];
  orderNumber?: string | null;
  status?: string | null;
  title?: string | null;
  serviceType?: string | null;
  service?: string | null;
  currency?: string | null;
  total?: string | number | null;
  estimatedTotal?: string | number | null;
  estimatedPrice?: string | number | null;
  finalPrice?: string | number | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
};

type DashboardOrdersResponse = {
  data?: {
    orders?: Order[];
  };
};

type OrderAction = {
  href: string;
  label: string;
  priority: number;
};

function normalizeStatus(value?: string | null) {
  return String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();
}

function normalizeCurrency(value?: string | null) {
  const currency = String(value ?? "CHF")
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(currency)
    ? currency
    : "CHF";
}

function formatAmount(
  value: string | number | null | undefined,
  currency?: string | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Noch offen";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatAppointment(value?: string | null) {
  if (!value) {
    return "Noch nicht geplant";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Noch nicht geplant";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function getOrderTitle(order: Order) {
  return (
    order.orderNumber ??
    order.title ??
    order.id
  );
}

function getOrderService(order: Order) {
  const rawValue = String(
    order.serviceType ??
      order.service ??
      "Reinigung",
  ).trim();

  const normalized = rawValue.toUpperCase();

  if (
    normalized === "REINIGUNG" ||
    normalized === "CLEANING"
  ) {
    return "Reinigung";
  }

  return rawValue || "Reinigung";
}

function getCustomerName(order: Order) {
  const customer = order.customer;

  if (!customer) {
    return "Kunde nicht angegeben";
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.companyName ||
    fullName ||
    customer.email ||
    "Kunde nicht angegeben"
  );
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

function getLatestEstimate(order: Order) {
  return Array.isArray(order.estimates)
    ? order.estimates[0] ?? null
    : null;
}

function isActiveOrder(order: Order) {
  const status = normalizeStatus(order.status);

  return (
    status !== "COMPLETED" &&
    status !== "CANCELLED"
  );
}

function getWorkflowLabel(order: Order) {
  const orderStatus = normalizeStatus(order.status);
  const estimateStatus = normalizeStatus(
    getLatestEstimate(order)?.status,
  );

  if (orderStatus === "SCHEDULED") {
    return "Geplant";
  }

  if (
    orderStatus === "ACCEPTED" ||
    orderStatus === "CONFIRMED"
  ) {
    return "Termin planen";
  }

  if (
    orderStatus === "WAITING_FOR_CUSTOMER" ||
    orderStatus === "SENT" ||
    estimateStatus === "SENT"
  ) {
    return "Wartet auf Kunden";
  }

  if (
    estimateStatus === "AI_REVIEW" ||
    estimateStatus === "NEEDS_HUMAN_REVIEW"
  ) {
    return "Zu prüfen";
  }

  if (
    estimateStatus === "READY_TO_SEND" ||
    estimateStatus === "APPROVED" ||
    orderStatus === "QUOTE_CREATED"
  ) {
    return "Offerte bereit";
  }

  if (
    orderStatus === "NEW" ||
    orderStatus === "OPEN" ||
    orderStatus === "PENDING"
  ) {
    return "Zu prüfen";
  }

  if (orderStatus === "IN_PROGRESS") {
    return "In Bearbeitung";
  }

  return "In Bearbeitung";
}

function getOrderAction(order: Order): OrderAction {
  const orderStatus = normalizeStatus(order.status);
  const latestEstimate = getLatestEstimate(order);
  const estimateStatus = normalizeStatus(
    latestEstimate?.status,
  );

  const orderHref =
    `/dashboard/orders/${order.id}`;

  const estimateHref = latestEstimate
    ? `/dashboard/estimates/${latestEstimate.id}`
    : orderHref;

  if (orderStatus === "SCHEDULED") {
    return {
      href: orderHref,
      label: "Auftrag abschliessen",
      priority: 3,
    };
  }

  if (
    orderStatus === "ACCEPTED" ||
    orderStatus === "CONFIRMED"
  ) {
    return {
      href: orderHref,
      label: "Termin planen",
      priority: 2,
    };
  }

  if (
    orderStatus === "WAITING_FOR_CUSTOMER" ||
    orderStatus === "SENT" ||
    estimateStatus === "SENT"
  ) {
    return {
      href: orderHref,
      label: "Auftrag öffnen",
      priority: 4,
    };
  }

  if (
    estimateStatus === "AI_REVIEW" ||
    estimateStatus === "NEEDS_HUMAN_REVIEW"
  ) {
    return {
      href: estimateHref,
      label: "Anfrage prüfen",
      priority: 0,
    };
  }

  if (
    estimateStatus === "READY_TO_SEND" ||
    estimateStatus === "APPROVED" ||
    orderStatus === "QUOTE_CREATED"
  ) {
    return {
      href: estimateHref,
      label: "Offerte senden",
      priority: 1,
    };
  }

  if (
    orderStatus === "NEW" ||
    orderStatus === "OPEN" ||
    orderStatus === "PENDING"
  ) {
    return {
      href: estimateHref,
      label: latestEstimate
        ? "Anfrage prüfen"
        : "Auftrag öffnen",
      priority: 0,
    };
  }

  return {
    href: orderHref,
    label: "Auftrag öffnen",
    priority: 5,
  };
}

function getOrderSortTimestamp(order: Order) {
  const value =
    order.scheduledAt ??
    order.createdAt;

  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? Number.MAX_SAFE_INTEGER
    : timestamp;
}

function OrderQueueCard({
  order,
  highlighted = false,
}: {
  order: Order;
  highlighted?: boolean;
}) {
  const action = getOrderAction(order);

  return (
    <article
      className={
        highlighted
          ? "rounded-3xl border border-cyan-300/35 bg-cyan-300/[0.08] p-5"
          : "rounded-2xl border border-white/10 bg-white/[0.025] p-4"
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_0.8fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Kunde
          </p>

          <h2 className="mt-1 text-lg font-black text-white">
            {getCustomerName(order)}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {getOrderTitle(order)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Leistung
          </p>

          <p className="mt-1 font-bold text-zinc-100">
            {getOrderService(order)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Termin
          </p>

          <p className="mt-1 font-bold text-zinc-100">
            {formatAppointment(order.scheduledAt)}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Betrag
          </p>

          <p className="mt-1 font-black text-emerald-100">
            {formatAmount(
              getOrderAmount(order),
              order.currency,
            )}
          </p>

          <div className="mt-2">
            <StatusBadge
              status={order.status}
              label={getWorkflowLabel(order)}
            />
          </div>
        </div>

        <div className="lg:text-right">
          <PremiumButton
            href={action.href}
            variant="primary"
            size="sm"
          >
            {action.label}
          </PremiumButton>
        </div>
      </div>
    </article>
  );
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/orders",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Die Aufträge konnten nicht geladen werden.",
        );
      }

      const json =
        (await response.json()) as DashboardOrdersResponse;

      setOrders(json.data?.orders ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Aufträge konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadOrders]);

  const activeOrders = useMemo(() => {
    return orders
      .filter(isActiveOrder)
      .sort((left, right) => {
        const priorityDifference =
          getOrderAction(left).priority -
          getOrderAction(right).priority;

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return (
          getOrderSortTimestamp(left) -
          getOrderSortTimestamp(right)
        );
      });
  }, [orders]);

  const nextOrder = activeOrders[0] ?? null;
  const remainingOrders = activeOrders.slice(1);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Aufträge"
          title="Aufträge"
          description="Nur aktive Arbeit: der nächste erforderliche Schritt und pro Auftrag genau eine Aktion."
        />

        {loading ? (
          <DashboardPanel
            title="Aufträge werden geladen"
            description="Die aktuelle Arbeitsliste wird vorbereitet."
          >
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          </DashboardPanel>
        ) : null}

        {errorMessage ? (
          <DashboardPanel
            title="Aufträge nicht verfügbar"
            description="Die Arbeitsliste konnte nicht geladen werden."
          >
            <p className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 font-bold text-red-100">
              {errorMessage}
            </p>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage && nextOrder ? (
          <DashboardPanel
            title="Nächster Schritt"
            description="Diese Aktion benötigt als Nächstes Ihre Entscheidung."
          >
            <OrderQueueCard
              order={nextOrder}
              highlighted
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Aktive Aufträge"
            description={
              remainingOrders.length > 0
                ? "Weitere laufende Arbeiten in der richtigen Reihenfolge."
                : nextOrder
                  ? "Keine weiteren aktiven Aufträge."
                  : "Aktuell ist keine Arbeit offen."
            }
          >
            {remainingOrders.length > 0 ? (
              <div className="grid gap-3">
                {remainingOrders.map((order) => (
                  <OrderQueueCard
                    key={order.id}
                    order={order}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-zinc-400">
                {nextOrder
                  ? "Nach dem nächsten Schritt ist die Arbeitsliste wieder leer."
                  : "Neue Kundenanfragen erscheinen automatisch hier, sobald eine Aktion erforderlich ist."}
              </div>
            )}
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}