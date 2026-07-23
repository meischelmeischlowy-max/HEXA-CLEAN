"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
      className={`grid gap-2 border-l-2 px-3 py-2.5 transition hover:bg-white/[0.04] xl:grid-cols-[56px_minmax(210px,1.1fr)_minmax(130px,0.65fr)_170px_130px_auto] xl:items-center ${
        highlighted
          ? "border-cyan-300/70 bg-cyan-300/[0.07]"
          : "border-white/15 bg-white/[0.015]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-flex min-w-10 justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[11px] font-black text-cyan-100">
          {highlighted ? "1" : "•"}
        </span>
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-sm font-black text-white">
          {getCustomerName(order)}
        </h2>

        <p className="mt-0.5 truncate text-xs text-white/50">
          {getOrderTitle(order)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-white/75">
          {getOrderService(order)}
        </p>

        <div className="mt-1">
          <StatusBadge
            status={order.status}
            label={getWorkflowLabel(order)}
          />
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
          Termin
        </p>

        <p className="mt-0.5 truncate text-xs font-semibold text-white/65">
          {formatAppointment(order.scheduledAt)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
          Betrag
        </p>

        <p className="mt-0.5 truncate text-xs font-black text-emerald-100">
          {formatAmount(
            getOrderAmount(order),
            order.currency,
          )}
        </p>
      </div>

      <div className="xl:text-right">
        <PremiumButton
          href={action.href}
          variant="primary"
          size="sm"
        >
          {action.label}
        </PremiumButton>
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
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Aufträge
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Aufträge
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Nur aktive Arbeit. Pro Auftrag zeigt das System genau den nächsten Schritt.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit shrink-0 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {activeOrders.length} aktiv
            </span>
          </div>
        </header>

        <section
          data-testid="orders-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Aktive Aufträge
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Der wichtigste Vorgang steht oben. Eine Zeile entspricht einem Auftrag.
              </p>
            </div>

            {nextOrder ? (
              <span className="shrink-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                Nächster Schritt
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {errorMessage ? (
            <div className="m-3 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm font-bold text-red-100">
              {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && nextOrder ? (
            <div className="divide-y divide-white/10">
              <OrderQueueCard
                order={nextOrder}
                highlighted
              />

              {remainingOrders.map((order) => (
                <OrderQueueCard
                  key={order.id}
                  order={order}
                />
              ))}
            </div>
          ) : null}

          {!loading && !errorMessage && !nextOrder ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine aktiven Aufträge
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Neue Kundenanfragen erscheinen automatisch, sobald eine Aktion erforderlich ist.
              </p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}