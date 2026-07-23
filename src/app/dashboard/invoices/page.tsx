"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

type InvoiceCustomer = {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  status?: string | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  currency?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  customer?: InvoiceCustomer | null;
};

type InvoicesResponse = {
  message?: string;
  data?: {
    status?: string;
    message?: string;
    invoices?: Invoice[];
  };
};

type InvoiceAction = {
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
    return 0;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatMoney(
  value?: string | number | null,
  currency = "CHF",
) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function customerName(customer?: InvoiceCustomer | null) {
  if (!customer) {
    return "Kein Kunde";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    customer.email ||
    "Kein Kunde"
  );
}

function statusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "DRAFT":
      return "Entwurf";

    case "SENT":
      return "Gesendet";

    case "PARTIALLY_PAID":
      return "Teilbezahlt";

    case "PAID":
      return "Bezahlt";

    case "OVERDUE":
      return "Überfällig";

    case "CANCELLED":
      return "Storniert";

    default:
      return "In Bearbeitung";
  }
}

function statusClass(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "PAID":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

    case "PARTIALLY_PAID":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";

    case "OVERDUE":
      return "border-red-300/25 bg-red-300/10 text-red-100";

    case "SENT":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";

    case "CANCELLED":
      return "border-zinc-300/20 bg-white/[0.05] text-zinc-300";

    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function getInvoiceAction(
  status?: string | null,
): InvoiceAction {
  switch (normalizeStatus(status)) {
    case "DRAFT":
      return {
        label: "Rechnung senden",
        priority: 0,
      };

    case "OVERDUE":
      return {
        label: "Zahlung prüfen",
        priority: 1,
      };

    case "PARTIALLY_PAID":
      return {
        label: "Restbetrag prüfen",
        priority: 2,
      };

    case "SENT":
      return {
        label: "Zahlung erfassen",
        priority: 3,
      };

    case "PAID":
      return {
        label: "Rechnung öffnen",
        priority: 5,
      };

    case "CANCELLED":
      return {
        label: "Rechnung prüfen",
        priority: 6,
      };

    default:
      return {
        label: "Rechnung öffnen",
        priority: 4,
      };
  }
}

function getInvoiceTimestamp(invoice: Invoice) {
  const value =
    invoice.dueDate ??
    invoice.issueDate ??
    invoice.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/invoices",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data =
        (await response.json()) as InvoicesResponse;

      if (!response.ok) {
        throw new Error(
          data.data?.message ??
            data.message ??
            "Die Rechnungen konnten nicht geladen werden.",
        );
      }

      setInvoices(data.data?.invoices ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Rechnungen konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvoices();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadInvoices]);

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((left, right) => {
      const priorityDifference =
        getInvoiceAction(left.status).priority -
        getInvoiceAction(right.status).priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        getInvoiceTimestamp(right) -
        getInvoiceTimestamp(left)
      );
    });
  }, [invoices]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (result, invoice) => {
        const total = toNumber(invoice.total);
        const paid = toNumber(invoice.paidAmount);
        const remaining = Math.max(total - paid, 0);

        result.total += total;
        result.paid += paid;
        result.open += remaining;

        if (
          normalizeStatus(invoice.status) === "OVERDUE"
        ) {
          result.overdue += 1;
        }

        return result;
      },
      {
        total: 0,
        paid: 0,
        open: 0,
        overdue: 0,
      },
    );
  }, [invoices]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Rechnungen
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Rechnungen
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Versand und Zahlung. Pro Rechnung genau der nächste erforderliche Schritt.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadInvoices}
              disabled={loading}
            >
              Aktualisieren
            </PremiumButton>
          </div>

          <div
            data-testid="invoices-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {invoices.length} gesamt
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {formatMoney(totals.total, "CHF")} fakturiert
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {formatMoney(totals.paid, "CHF")} bezahlt
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {formatMoney(totals.open, "CHF")} offen
            </span>

            <span className="rounded-lg border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-100">
              {totals.overdue} überfällig
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="invoices-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Aktive Rechnungen
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Entwürfe, überfällige und offene Rechnungen stehen zuerst.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedInvoices.length} Positionen
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
          sortedInvoices.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Rechnungen vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Rechnungen entstehen automatisch nach Abschluss eines Auftrags.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedInvoices.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedInvoices.map((invoice) => {
                const currency = normalizeCurrency(
                  invoice.currency,
                );

                const total = toNumber(invoice.total);
                const paid = toNumber(invoice.paidAmount);
                const remaining = Math.max(
                  total - paid,
                  0,
                );

                const action = getInvoiceAction(
                  invoice.status,
                );

                return (
                  <article
                    key={invoice.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(190px,1fr)_minmax(190px,0.9fr)_120px_140px_140px_120px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {invoice.invoiceNumber ?? invoice.id}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        Erstellt:{" "}
                        {formatDate(
                          invoice.issueDate ??
                            invoice.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-100">
                        {customerName(invoice.customer)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {invoice.customer?.email ??
                          "Keine E-Mail"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClass(
                          invoice.status,
                        )}`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Total
                      </p>

                      <p className="mt-0.5 truncate text-xs font-black text-zinc-100">
                        {formatMoney(total, currency)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Offen
                      </p>

                      <p className="mt-0.5 truncate text-xs font-black text-amber-100">
                        {formatMoney(
                          remaining,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Fällig bis
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                        {formatDate(invoice.dueDate)}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/invoices/${invoice.id}`}
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