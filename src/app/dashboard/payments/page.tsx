"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
};

type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  status?: string | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  currency?: string | null;
  customer?: Customer | null;
};

type Payment = {
  id: string;
  invoiceId?: string | null;
  orderId?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  method?: string | null;
  externalRef?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  invoice?: InvoiceOption | null;
};

type DashboardPaymentsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    payments: Payment[];
    invoices: InvoiceOption[];
  };
};

function normalizeCurrency(value?: string | null) {
  const currency = String(value ?? "CHF")
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(currency)
    ? currency
    : "CHF";
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "UNKNOWN")
    .trim()
    .toUpperCase();
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
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function formatPaymentMethod(method?: string | null) {
  switch (String(method ?? "").toUpperCase()) {
    case "BANK_TRANSFER":
      return "Banküberweisung";

    case "CASH":
      return "Barzahlung";

    case "CARD":
      return "Karte";

    case "TWINT":
      return "TWINT";

    default:
      return "Andere Methode";
  }
}

function customerName(customer?: Customer | null) {
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

function invoiceLabel(invoice?: InvoiceOption | null) {
  if (!invoice) {
    return "Keine Rechnung";
  }

  return `${invoice.invoiceNumber || invoice.id} · ${customerName(
    invoice.customer,
  )}`;
}

function statusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "PAID":
      return "Bezahlt";

    case "PENDING":
      return "Ausstehend";

    case "FAILED":
      return "Fehlgeschlagen";

    case "CANCELLED":
    case "CANCELED":
      return "Storniert";

    case "REFUNDED":
      return "Erstattet";

    default:
      return "In Bearbeitung";
  }
}

function statusClass(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "PAID":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

    case "PENDING":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";

    case "FAILED":
    case "CANCELLED":
    case "CANCELED":
      return "border-red-300/25 bg-red-300/10 text-red-100";

    case "REFUNDED":
      return "border-violet-300/25 bg-violet-300/10 text-violet-100";

    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function paymentPriority(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "FAILED":
    case "CANCELLED":
    case "CANCELED":
      return 0;

    case "PENDING":
      return 1;

    case "REFUNDED":
      return 2;

    case "PAID":
      return 3;

    default:
      return 4;
  }
}

function paymentTimestamp(payment: Payment) {
  const value =
    payment.paidAt ??
    payment.createdAt ??
    payment.updatedAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export default function DashboardPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [externalRef, setExternalRef] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/payments",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Die Zahlungen konnten nicht geladen werden.",
        );
      }

      const json =
        (await response.json()) as DashboardPaymentsResponse;

      setPayments(json.data.payments ?? []);
      setInvoices(json.data.invoices ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Zahlungen konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPayments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPayments]);

  const selectedInvoice = useMemo(() => {
    return (
      invoices.find(
        (invoice) => invoice.id === invoiceId,
      ) ?? null
    );
  }, [invoiceId, invoices]);

  const selectedRemaining = useMemo(() => {
    if (!selectedInvoice) {
      return 0;
    }

    return Math.max(
      toNumber(selectedInvoice.total) -
        toNumber(selectedInvoice.paidAmount),
      0,
    );
  }, [selectedInvoice]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((left, right) => {
      const priorityDifference =
        paymentPriority(left.status) -
        paymentPriority(right.status);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        paymentTimestamp(right) -
        paymentTimestamp(left)
      );
    });
  }, [payments]);

  const stats = useMemo(() => {
    return payments.reduce(
      (result, payment) => {
        const value = toNumber(payment.amount);
        const status = normalizeStatus(payment.status);

        result.totalValue += value;

        if (status === "PAID") {
          result.paid += 1;
          result.paidValue += value;
        }

        if (status === "PENDING") {
          result.pending += 1;
          result.pendingValue += value;
        }

        if (
          ["FAILED", "CANCELLED", "CANCELED"].includes(
            status,
          )
        ) {
          result.failed += 1;
        }

        return result;
      },
      {
        paid: 0,
        pending: 0,
        failed: 0,
        totalValue: 0,
        paidValue: 0,
        pendingValue: 0,
      },
    );
  }, [payments]);

  async function createPayment() {
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceId,
            amount,
            method,
            status: "PAID",
            externalRef,
            notes,
          }),
        },
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.data?.message ??
            `HTTP ${response.status}`,
        );
      }

      setAmount("");
      setExternalRef("");
      setNotes("");
      setMessage(
        "Die Zahlung wurde gespeichert und die Rechnung aktualisiert.",
      );
      setFormOpen(false);

      await loadPayments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Zahlung konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  function fillRemainingAmount() {
    if (!selectedInvoice) {
      return;
    }

    setAmount(selectedRemaining.toFixed(2));
  }

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Zahlungen
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Zahlungen
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Zahlungseingänge erfassen und Rechnungen automatisch aktualisieren.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadPayments}
                disabled={loading}
              >
                Aktualisieren
              </PremiumButton>

              <PremiumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setFormOpen((value) => !value)}
              >
                {formOpen
                  ? "Formular schliessen"
                  : "Zahlung erfassen"}
              </PremiumButton>
            </div>
          </div>

          <div
            data-testid="payments-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {payments.length} gesamt
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {formatMoney(stats.totalValue, "CHF")}
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.paid} bezahlt · {formatMoney(stats.paidValue, "CHF")}
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.pending} ausstehend · {formatMoney(stats.pendingValue, "CHF")}
            </span>

            <span className="rounded-lg border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-100">
              {stats.failed} Probleme
            </span>
          </div>
        </header>

        {formOpen ? (
          <section
            data-testid="payment-entry-form"
            className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-3"
          >
            <div className="grid gap-2 xl:grid-cols-[minmax(260px,1.5fr)_140px_170px_auto]">
              <select
                value={invoiceId}
                onChange={(event) =>
                  setInvoiceId(event.target.value)
                }
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              >
                <option value="">
                  Rechnung auswählen
                </option>

                {invoices.map((invoice) => (
                  <option
                    key={invoice.id}
                    value={invoice.id}
                  >
                    {invoiceLabel(invoice)} · offen{" "}
                    {formatMoney(
                      Math.max(
                        toNumber(invoice.total) -
                          toNumber(invoice.paidAmount),
                        0,
                      ),
                      invoice.currency ?? "CHF",
                    )}
                  </option>
                ))}
              </select>

              <input
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                placeholder="Betrag"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />

              <select
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value)
                }
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              >
                <option value="BANK_TRANSFER">
                  Banküberweisung
                </option>
                <option value="CASH">
                  Barzahlung
                </option>
                <option value="TWINT">
                  TWINT
                </option>
                <option value="CARD">
                  Karte
                </option>
                <option value="OTHER">
                  Andere Methode
                </option>
              </select>

              <div className="flex gap-2">
                <PremiumButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={fillRemainingAmount}
                  disabled={
                    !selectedInvoice ||
                    selectedRemaining <= 0
                  }
                >
                  Restbetrag
                </PremiumButton>

                <PremiumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={createPayment}
                  disabled={
                    saving ||
                    !invoiceId ||
                    !amount
                  }
                >
                  {saving
                    ? "Speichert..."
                    : "Speichern"}
                </PremiumButton>
              </div>
            </div>

            <div className="mt-2 grid gap-2 xl:grid-cols-2">
              <input
                value={externalRef}
                onChange={(event) =>
                  setExternalRef(event.target.value)
                }
                placeholder="Referenz / Transaktionsnummer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />

              <input
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Notiz"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </div>
          </section>
        ) : null}

        {message ? (
          <section className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-100">
            {message}
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="payments-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Zahlungseingänge
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Problematische und ausstehende Zahlungen stehen zuerst.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedPayments.length} Positionen
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
          sortedPayments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Zahlungen vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Die erste Zahlung erscheint nach der Erfassung zu einer Rechnung.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedPayments.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedPayments.map((payment) => (
                <article
                  key={payment.id}
                  className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(190px,1fr)_120px_140px_160px_minmax(190px,0.9fr)_140px_auto] xl:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-cyan-100">
                      {payment.externalRef ??
                        payment.id}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {formatDate(
                        payment.paidAt ??
                          payment.createdAt,
                      )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span
                      className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClass(
                        payment.status,
                      )}`}
                    >
                      {statusLabel(payment.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      Betrag
                    </p>

                    <p className="mt-0.5 truncate text-xs font-black text-emerald-100">
                      {formatMoney(
                        payment.amount,
                        payment.currency ?? "CHF",
                      )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-100">
                      {formatPaymentMethod(
                        payment.method,
                      )}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      Ref: {payment.externalRef ?? "Keine"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-zinc-100">
                      {payment.invoice?.invoiceNumber ??
                        payment.invoiceId ??
                        "Keine Rechnung"}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {customerName(
                        payment.invoice?.customer,
                      )}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      Bezahlt am
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                      {formatDate(payment.paidAt)}
                    </p>
                  </div>

                  <div className="xl:text-right">
                    <PremiumButton
                      href={`/dashboard/payments/${payment.id}`}
                      variant="primary"
                      size="sm"
                    >
                      Zahlung öffnen
                    </PremiumButton>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}