"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

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

type QuoteAction = {
  label: string;
  priority: number;
};

function normalizeStatus(status?: string | null) {
  return String(status ?? "UNKNOWN")
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

function toNumber(value?: string | number | null) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  return Number.isFinite(number)
    ? number
    : null;
}

function formatMoney(
  value?: string | number | null,
  currency = "CHF",
) {
  const number = toNumber(value);

  if (number === null) {
    return "Noch offen";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Nicht festgelegt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nicht festgelegt";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function getQuoteNumber(quote: Quote) {
  return (
    quote.quoteNumber ??
    quote.number ??
    quote.id
  );
}

function getQuoteDeadline(quote: Quote) {
  return (
    quote.validUntil ??
    quote.dueDate ??
    null
  );
}

function getQuoteStatusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "DRAFT":
      return "Entwurf";

    case "READY_TO_SEND":
      return "Versandbereit";

    case "SENT":
      return "Versendet";

    case "ACCEPTED":
      return "Akzeptiert";

    case "REJECTED":
      return "Abgelehnt";

    case "EXPIRED":
      return "Abgelaufen";

    default:
      return "In Bearbeitung";
  }
}

function getQuoteStatusClass(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "DRAFT":
      return "border-zinc-300/20 bg-white/[0.05] text-zinc-200";

    case "READY_TO_SEND":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";

    case "SENT":
      return "border-violet-300/25 bg-violet-300/10 text-violet-100";

    case "ACCEPTED":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

    case "REJECTED":
      return "border-red-300/25 bg-red-300/10 text-red-100";

    case "EXPIRED":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";

    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function getQuoteAction(
  status?: string | null,
): QuoteAction {
  switch (normalizeStatus(status)) {
    case "DRAFT":
    case "READY_TO_SEND":
      return {
        label: "Offerte senden",
        priority: 0,
      };

    case "ACCEPTED":
      return {
        label: "Auftrag öffnen",
        priority: 2,
      };

    case "SENT":
      return {
        label: "Entscheidung prüfen",
        priority: 1,
      };

    case "REJECTED":
    case "EXPIRED":
      return {
        label: "Offerte prüfen",
        priority: 4,
      };

    default:
      return {
        label: "Offerte öffnen",
        priority: 3,
      };
  }
}

function getQuoteTimestamp(quote: Quote) {
  const value =
    quote.createdAt ??
    quote.updatedAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export default function DashboardQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/quotes",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Die Offerten konnten nicht geladen werden.",
        );
      }

      const json =
        (await response.json()) as DashboardQuotesResponse;

      setQuotes(json.data.quotes ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Offerten konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQuotes();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadQuotes]);

  const sortedQuotes = useMemo(() => {
    return [...quotes].sort((left, right) => {
      const priorityDifference =
        getQuoteAction(left.status).priority -
        getQuoteAction(right.status).priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        getQuoteTimestamp(right) -
        getQuoteTimestamp(left)
      );
    });
  }, [quotes]);

  const stats = useMemo(() => {
    const draft = quotes.filter(
      (quote) =>
        normalizeStatus(quote.status) === "DRAFT" ||
        normalizeStatus(quote.status) === "READY_TO_SEND",
    ).length;

    const sent = quotes.filter(
      (quote) =>
        normalizeStatus(quote.status) === "SENT",
    ).length;

    const accepted = quotes.filter(
      (quote) =>
        normalizeStatus(quote.status) === "ACCEPTED",
    ).length;

    const totalValue = quotes.reduce(
      (sum, quote) => {
        const value = toNumber(quote.total);

        return value === null
          ? sum
          : sum + value;
      },
      0,
    );

    return {
      total: quotes.length,
      draft,
      sent,
      accepted,
      totalValue,
    };
  }, [quotes]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Offerten
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Offerten
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Versand und Kundenentscheidung. Pro Offerte genau der nächste Schritt.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadQuotes}
              disabled={loading}
            >
              Aktualisieren
            </PremiumButton>
          </div>

          <div
            data-testid="quotes-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {stats.total} gesamt
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {formatMoney(stats.totalValue, "CHF")}
            </span>

            <span className="rounded-lg border border-zinc-300/20 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-200">
              {stats.draft} bereit
            </span>

            <span className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100">
              {stats.sent} versendet
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.accepted} akzeptiert
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="quotes-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Aktive Offerten
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Versandbereite und versendete Offerten stehen zuerst.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedQuotes.length} Positionen
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedQuotes.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Offerten vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Die erste Offerte erscheint automatisch nach der Freigabe einer Kalkulation.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedQuotes.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedQuotes.map((quote) => {
                const action =
                  getQuoteAction(quote.status);

                return (
                  <article
                    key={quote.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(190px,1fr)_120px_minmax(180px,0.9fr)_140px_130px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {getQuoteNumber(quote)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        Auftrag: {quote.orderId ?? "Nicht verknüpft"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${getQuoteStatusClass(
                          quote.status,
                        )}`}
                      >
                        {getQuoteStatusLabel(quote.status)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-100">
                        Kunde
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {quote.customerId ?? "Nicht verknüpft"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-emerald-100">
                        {formatMoney(
                          quote.total,
                          quote.currency ?? "CHF",
                        )}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        Erstellt: {formatDate(quote.createdAt)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Gültig bis
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                        {formatDate(getQuoteDeadline(quote))}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/quotes/${quote.id}`}
                        variant="primary"
                        size="sm"
                      >
                        {action.label}
                      </PremiumButton>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}