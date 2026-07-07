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

type Quote = {
  id: string;
  quoteNumber?: string | null;
  number?: string | null;
  status?: string | null;
  subtotal?: string | number | null;
  taxRate?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
  currency?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  sessionId?: string | null;
  validUntil?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardQuotesResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    quotes: Quote[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isNaN(parsed) ? null : parsed;
}

function formatMoney(value?: string | number | null, currency = "CHF") {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatTaxRate(value?: string | number | null) {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return `${numberValue}%`;
}

function getQuoteNumber(quote: Quote) {
  return quote.quoteNumber ?? quote.number ?? quote.id;
}

function getQuoteDeadline(quote: Quote) {
  return quote.validUntil ?? quote.dueDate ?? null;
}

function normalizeStatus(status?: string | null) {
  return status?.toUpperCase() ?? "UNKNOWN";
}

export default function DashboardQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/quotes", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Die Angebots-API hat einen Fehler zurückgegeben.");
      }

      const json: DashboardQuotesResponse = await response.json();

      setQuotes(json.data.quotes ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unbekannter Angebotsfehler",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const stats = useMemo(() => {
    const draft = quotes.filter(
      (quote) => normalizeStatus(quote.status) === "DRAFT",
    ).length;

    const sent = quotes.filter(
      (quote) => normalizeStatus(quote.status) === "SENT",
    ).length;

    const accepted = quotes.filter(
      (quote) => normalizeStatus(quote.status) === "ACCEPTED",
    ).length;

    const totalValue = quotes.reduce((sum, quote) => {
      const amount = toNumber(quote.total);
      return amount === null ? sum : sum + amount;
    }, 0);

    return {
      total: quotes.length,
      draft,
      sent,
      accepted,
      totalValue,
    };
  }, [quotes]);

  const columns: DashboardTableColumn<Quote>[] = [
    {
      key: "quote",
      header: "Angebot",
      render: (quote) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {getQuoteNumber(quote)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {quote.id}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (quote) => <StatusBadge status={quote.status} />,
    },
    {
      key: "links",
      header: "Verknüpfungen",
      render: (quote) => (
        <div className="space-y-1">
          <p className="text-sm text-zinc-300">
            Kunde:{" "}
            <span className="font-semibold text-zinc-100">
              {quote.customerId ?? "—"}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            Auftrag: {quote.orderId ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "subtotal",
      header: "Zwischensumme",
      render: (quote) => (
        <p className="font-semibold text-zinc-200">
          {formatMoney(quote.subtotal, quote.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "tax",
      header: "Steuer",
      render: (quote) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {formatMoney(quote.taxAmount, quote.currency ?? "CHF")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Satz: {formatTaxRate(quote.taxRate)}
          </p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (quote) => (
        <p className="font-black text-emerald-100">
          {formatMoney(quote.total, quote.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "deadline",
      header: "Gültig bis",
      render: (quote) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(getQuoteDeadline(quote))}
        </p>
      ),
    },
    {
      key: "action",
      header: "Aktion",
      className: "text-right",
      render: (quote) => (
        <div className="flex justify-end">
          <PremiumButton
            href={`/dashboard/quotes/${quote.id}`}
            variant="primary"
            size="sm"
          >
            Details
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Angebote"
          title="Angebote"
          description="Das Angebotsmodul verbindet Kunden, Aufträge, freigegebene Kalkulationen, Angebotsstatus und spätere Rechnungen."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadQuotes}
            disabled={loading}
          >
            Aktualisieren
          </PremiumButton>
          <PremiumButton href="/dashboard/orders" variant="ghost">
            Aufträge
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Alle Angebote"
            value={String(stats.total)}
            description="Gesamtzahl der in der Datenbank gespeicherten Angebote."
            trend="Quelle: Angebots-API"
            tone="cyan"
            icon={<span className="text-lg font-black">A</span>}
          />

          <MetricCard
            title="Entwürfe"
            value={String(stats.draft)}
            description="Angebote, die vorbereitet, aber noch nicht versendet wurden."
            trend="Status DRAFT"
            tone="zinc"
            icon={<span className="text-lg font-black">D</span>}
          />

          <MetricCard
            title="Versendet"
            value={String(stats.sent)}
            description="Angebote, die dem Kunden zur Entscheidung übermittelt wurden."
            trend="Status SENT"
            tone="violet"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="Akzeptiert"
            value={String(stats.accepted)}
            description="Angebote, die für die Umwandlung in eine Rechnung bereit sind."
            trend={formatMoney(stats.totalValue, "CHF")}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Angebote werden geladen"
            description="HEXA OS lädt die aktuellen Daten aus dem Angebotsmodul."
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
            title="Fehler im Angebotsmodul"
            description="Die Angebotsliste konnte nicht aus der API geladen werden."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Fehler: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Prüfen Sie den Endpoint /api/dashboard/quotes und die
                Datenbankverbindung.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Angebotsliste"
            description={`Anzahl Datensätze: ${quotes.length}. Ein Angebot ist der Schritt zwischen der Kalkulation und der Rechnung.`}
            action={
              <StatusBadge
                status={quotes.length > 0 ? "ACCEPTED" : "PENDING"}
                label={quotes.length > 0 ? "Angebote aktiv" : "Keine Angebote"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={quotes}
              getRowKey={(quote) => quote.id}
              empty={
                <EmptyState
                  title="Keine Angebote in der Datenbank"
                  description="Das erste Angebot erscheint hier nach der Erstellung aus einer freigegebenen Kalkulation."
                  actionLabel="Zu den Aufträgen"
                  actionHref="/dashboard/orders"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rolle des Angebotsmoduls"
            description="Angebote werden aus freigegebenen Kalkulationen erstellt und anschließend im Kundenworkflow weiterverarbeitet."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Von der Kalkulation zum Angebot
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Eine geprüfte Kalkulation wird als offizielles Angebot
                  vorbereitet und mit Kunde, Auftrag und Verlauf verknüpft.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Versand an den Kunden
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Der Versand läuft über den Angebotsstatus, Benachrichtigungen
                  und den dokumentierten Systemverlauf.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Akzeptanz
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Ein akzeptiertes Angebot wird im Workflow von HEXA OS weiter
                  zu Rechnung und Zahlung verarbeitet.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}