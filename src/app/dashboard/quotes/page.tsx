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
        throw new Error("Dashboard Quotes API returned an error");
      }

      const json: DashboardQuotesResponse = await response.json();

      setQuotes(json.data.quotes ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown quotes error"
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
      (quote) => normalizeStatus(quote.status) === "DRAFT"
    ).length;

    const sent = quotes.filter(
      (quote) => normalizeStatus(quote.status) === "SENT"
    ).length;

    const accepted = quotes.filter(
      (quote) => normalizeStatus(quote.status) === "ACCEPTED"
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
      header: "Oferta",
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
      header: "Powiązania",
      render: (quote) => (
        <div className="space-y-1">
          <p className="text-sm text-zinc-300">
            Klient:{" "}
            <span className="font-semibold text-zinc-100">
              {quote.customerId ?? "—"}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            Zlecenie: {quote.orderId ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "subtotal",
      header: "Subtotal",
      render: (quote) => (
        <p className="font-semibold text-zinc-200">
          {formatMoney(quote.subtotal, quote.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "tax",
      header: "Podatek",
      render: (quote) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {formatMoney(quote.taxAmount, quote.currency ?? "CHF")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Stawka: {formatTaxRate(quote.taxRate)}
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
      header: "Ważna do",
      render: (quote) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(getQuoteDeadline(quote))}
        </p>
      ),
    },
    {
      key: "action",
      header: "Akcja",
      className: "text-right",
      render: (quote) => (
        <div className="flex justify-end">
          <PremiumButton
            href={`/dashboard/quotes/${quote.id}`}
            variant="primary"
            size="sm"
          >
            Szczegóły
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Quotes"
          title="Oferty i wyceny"
          description="Moduł ofert łączy zlecenia, klientów i przyszły kalkulator wyceny. Tutaj oferta przechodzi ze szkicu do wysyłki, akceptacji i późniejszej faktury."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadQuotes}
            disabled={loading}
          >
            Odśwież
          </PremiumButton>
          <PremiumButton href="/dashboard/orders" variant="ghost">
            Zlecenia
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Wszystkie oferty"
            value={String(stats.total)}
            description="Łączna liczba ofert zapisanych w bazie."
            trend="Źródło: Quotes API"
            tone="cyan"
            icon={<span className="text-lg font-black">Q</span>}
          />

          <MetricCard
            title="Szkice"
            value={String(stats.draft)}
            description="Oferty przygotowane, ale jeszcze niewysłane."
            trend="Status DRAFT"
            tone="zinc"
            icon={<span className="text-lg font-black">D</span>}
          />

          <MetricCard
            title="Wysłane"
            value={String(stats.sent)}
            description="Oferty przekazane klientowi do decyzji."
            trend="Status SENT"
            tone="violet"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="Zaakceptowane"
            value={String(stats.accepted)}
            description="Oferty gotowe do przejścia w fakturę."
            trend={formatMoney(stats.totalValue, "CHF")}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Ładowanie ofert"
            description="HEXA OS pobiera aktualne dane z modułu Quotes."
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
            title="Błąd modułu Quotes"
            description="Nie udało się pobrać listy ofert z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/quotes oraz połączenie z bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Lista ofert"
            description={`Liczba rekordów: ${quotes.length}. Oferta jest etapem pomiędzy wyceną roboczą a fakturą.`}
            action={
              <StatusBadge
                status={quotes.length > 0 ? "ACCEPTED" : "PENDING"}
                label={quotes.length > 0 ? "Oferty aktywne" : "Brak ofert"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={quotes}
              getRowKey={(quote) => quote.id}
              empty={
                <EmptyState
                  title="Brak ofert w bazie"
                  description="Pierwsza oferta pojawi się tutaj po utworzeniu jej ze zlecenia albo po wdrożeniu modułu wyceny HEXA OS."
                  actionLabel="Przejdź do zleceń"
                  actionHref="/dashboard/orders"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola modułu Quotes"
            description="Docelowo oferty będą tworzone z oficjalnej wyceny, zatwierdzanej po danych klienta, zdjęciach i kontroli właściciela."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Z wyceny do oferty
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  AI i kalkulator mogą przygotować cenę roboczą, ale oficjalna
                  oferta powinna być zatwierdzona przez człowieka.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Wysyłka do klienta
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Kolejny etap to PDF z logo, email do klienta oraz zapis w
                  EmailLog i AuditLog.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Akceptacja
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Zaakceptowana oferta przechodzi dalej do faktury i płatności w
                  workflow HEXA OS.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}