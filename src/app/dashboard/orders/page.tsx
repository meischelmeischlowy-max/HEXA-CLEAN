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

type Order = {
  id: string;
  customerId?: string | null;
  customer?: OrderCustomer | null;
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
    loadOrders();
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
      estimatedValue,
    };
  }, [orders]);

  const columns: DashboardTableColumn<Order>[] = [
    {
      key: "order",
      header: "Auftrag",
      render: (order) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {getOrderTitle(order)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {order.id}</p>
          {order.description ? (
            <p className="mt-1 max-w-sm truncate text-xs text-zinc-500">
              {order.description}
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
      key: "location",
      header: "Miejsce",
      render: (order) => (
        <p className="max-w-xs text-zinc-400">{getOrderLocation(order)}</p>
      ),
    },
    {
      key: "amount",
      header: "Kwota",
      render: (order) => (
        <p className="font-black text-emerald-100">
          {formatAmount(getOrderAmount(order), order.currency)}
        </p>
      ),
    },
    {
      key: "created",
      header: "Dodano",
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
      render: (order) => (
        <div className="flex flex-wrap justify-end gap-2">
          <PremiumButton
            href={`/dashboard/orders/${order.id}`}
            variant="primary"
            size="sm"
          >
            Details
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/orders/${order.id}/edit`}
            variant="secondary"
            size="sm"
          >
            Bearbeiten
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/estimates?orderId=${order.id}`}
            variant="secondary"
            size="sm"
          >
            Kalkulationen
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/invoices?orderId=${order.id}`}
            variant="ghost"
            size="sm"
          >
            Rechnungen
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Aufträge"
          title="Operative Aufträge"
          description="Zentrales Arbeitscenter für Kundenaufträge: Status, Orte, Beträge, Workflow und der Übergang zu Kunden, Kalkulationen, Rechnungen und Zahlungen."
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            title="Abgeschlossen"
            value={String(stats.completed)}
            description="Aufträge, die in HEXA OS als abgeschlossen markiert sind."
            trend="Status ABGESCHLOSSEN"
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
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
                Prüfen Sie den Endpoint /api/dashboard/orders und die Datenbankverbindung.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Auftragsliste"
            description={`Anzahl Datensätze: ${orders.length}. Öffnen Sie Details oder Bearbeiten, um in den Auftrags-Workflow zu gelangen.`}
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
                  description="Erstellen Sie einen Auftrag manuell oder später über AI Concierge, Formular oder Telefonanruf."
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