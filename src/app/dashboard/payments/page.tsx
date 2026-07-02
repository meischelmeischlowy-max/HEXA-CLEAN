"use client";

import Link from "next/link";
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
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;
  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

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
    return 0;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value?: string | number | null, currency = "CHF") {
  const numberValue = toNumber(value);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function normalizeStatus(status?: string | null) {
  return status?.toUpperCase() ?? "UNKNOWN";
}

function formatPaymentMethod(method?: string | null) {
  if (!method) return "—";

  const labels: Record<string, string> = {
    BANK_TRANSFER: "Przelew bankowy",
    CASH: "Gotówka",
    CARD: "Karta",
    TWINT: "TWINT",
    OTHER: "Inna metoda",
  };

  return labels[method.toUpperCase()] ?? method;
}

function customerName(customer?: Customer | null) {
  if (!customer) return "Brak klienta";
  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || "Brak klienta";
}

function invoiceLabel(invoice?: InvoiceOption | null) {
  if (!invoice) return "Brak faktury";

  return `${invoice.invoiceNumber || invoice.id} · ${customerName(invoice.customer)}`;
}

export default function DashboardPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [externalRef, setExternalRef] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/payments", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard Payments API returned an error");
      }

      const json: DashboardPaymentsResponse = await response.json();

      setPayments(json.data.payments ?? []);
      setInvoices(json.data.invoices ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown payments error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const selectedInvoice = useMemo(() => {
    return invoices.find((invoice) => invoice.id === invoiceId) ?? null;
  }, [invoiceId, invoices]);

  const selectedRemaining = useMemo(() => {
    if (!selectedInvoice) return 0;

    return Math.max(
      toNumber(selectedInvoice.total) - toNumber(selectedInvoice.paidAmount),
      0,
    );
  }, [selectedInvoice]);

  const stats = useMemo(() => {
    const pending = payments.filter(
      (payment) => normalizeStatus(payment.status) === "PENDING",
    ).length;

    const paid = payments.filter(
      (payment) => normalizeStatus(payment.status) === "PAID",
    ).length;

    const failed = payments.filter((payment) =>
      ["FAILED", "CANCELLED", "CANCELED"].includes(normalizeStatus(payment.status)),
    ).length;

    const totalValue = payments.reduce((sum, payment) => {
      return sum + toNumber(payment.amount);
    }, 0);

    const paidValue = payments.reduce((sum, payment) => {
      return normalizeStatus(payment.status) === "PAID"
        ? sum + toNumber(payment.amount)
        : sum;
    }, 0);

    const pendingValue = payments.reduce((sum, payment) => {
      return normalizeStatus(payment.status) === "PENDING"
        ? sum + toNumber(payment.amount)
        : sum;
    }, 0);

    return {
      total: payments.length,
      pending,
      paid,
      failed,
      totalValue,
      paidValue,
      pendingValue,
    };
  }, [payments]);

  async function createPayment() {
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/payments", {
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
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.data?.message || `HTTP ${response.status}`);
      }

      setAmount("");
      setExternalRef("");
      setNotes("");
      setMessage("Płatność została zapisana i faktura została zaktualizowana.");

      await loadPayments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nie udało się zapisać płatności.",
      );
    } finally {
      setSaving(false);
    }
  }

  function fillRemainingAmount() {
    if (!selectedInvoice) return;

    setAmount(selectedRemaining.toFixed(2));
  }

  const columns: DashboardTableColumn<Payment>[] = [
    {
      key: "payment",
      header: "Płatność",
      render: (payment) => (
        <div>
          <p className="max-w-xs truncate font-black tracking-tight text-white">
            {payment.externalRef || payment.id}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {payment.id}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: "amount",
      header: "Kwota",
      render: (payment) => (
        <p className="font-black text-emerald-100">
          {formatMoney(payment.amount, payment.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "method",
      header: "Metoda",
      render: (payment) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {formatPaymentMethod(payment.method)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ref: {payment.externalRef ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "invoice",
      header: "Faktura",
      render: (payment) => (
        <div>
          <p className="max-w-xs truncate font-semibold text-zinc-200">
            {payment.invoice?.invoiceNumber ?? payment.invoiceId ?? "—"}
          </p>
          <p className="mt-1 max-w-xs truncate text-xs text-zinc-500">
            {customerName(payment.invoice?.customer)}
          </p>
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Zapłacono",
      render: (payment) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(payment.paidAt)}
        </p>
      ),
    },
    {
      key: "created",
      header: "Dodano",
      render: (payment) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(payment.createdAt)}
        </p>
      ),
    },
    {
      key: "action",
      header: "Akcja",
      className: "text-right",
      render: (payment) => (
        <div className="flex justify-end gap-2">
          {payment.invoiceId ? (
            <PremiumButton
              href={`/dashboard/invoices/${payment.invoiceId}`}
              variant="primary"
              size="sm"
            >
              Faktura
            </PremiumButton>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Payments"
          title="Płatności"
          description="Rejestruj realne wpłaty do faktur. Każda opłacona płatność aktualizuje kwotę zapłaconą i status faktury."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadPayments}
            disabled={loading}
          >
            Odśwież
          </PremiumButton>
          <PremiumButton href="/dashboard/invoices" variant="ghost">
            Faktury
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Wszystkie płatności"
            value={String(stats.total)}
            description="Łączna liczba płatności zapisanych w bazie."
            trend={formatMoney(stats.totalValue, "CHF")}
            tone="cyan"
            icon={<span className="text-lg font-black">PAY</span>}
          />

          <MetricCard
            title="Oczekujące"
            value={String(stats.pending)}
            description="Płatności utworzone, ale jeszcze nieopłacone."
            trend={formatMoney(stats.pendingValue, "CHF")}
            tone="amber"
            icon={<span className="text-lg font-black">…</span>}
          />

          <MetricCard
            title="Opłacone"
            value={String(stats.paid)}
            description="Płatności oznaczone jako PAID."
            trend={formatMoney(stats.paidValue, "CHF")}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />

          <MetricCard
            title="Problemy"
            value={String(stats.failed)}
            description="Płatności anulowane lub nieudane."
            trend="Do kontroli ręcznej"
            tone={stats.failed > 0 ? "red" : "zinc"}
            icon={<span className="text-lg font-black">!</span>}
          />
        </section>

        <DashboardPanel
          title="Dodaj płatność do faktury"
          description="Wpisana wpłata utworzy rekord Payment i automatycznie zaktualizuje fakturę."
        >
          <div className="grid gap-4 xl:grid-cols-[1.5fr_0.7fr_0.7fr_1fr]">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Faktura
              </span>
              <select
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400"
              >
                <option value="">Wybierz fakturę</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoiceLabel(invoice)} · pozostało{" "}
                    {formatMoney(
                      Math.max(toNumber(invoice.total) - toNumber(invoice.paidAmount), 0),
                      invoice.currency ?? "CHF",
                    )}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Kwota
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="np. 100.00"
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Metoda
              </span>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-400"
              >
                <option value="BANK_TRANSFER">Przelew bankowy</option>
                <option value="CASH">Gotówka</option>
                <option value="TWINT">TWINT</option>
                <option value="CARD">Karta</option>
                <option value="OTHER">Inna metoda</option>
              </select>
            </label>

            <div className="flex items-end gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                onClick={fillRemainingAmount}
                disabled={!selectedInvoice || selectedRemaining <= 0}
              >
                Reszta
              </PremiumButton>

              <PremiumButton
                type="button"
                variant="primary"
                onClick={createPayment}
                disabled={saving || !invoiceId || !amount}
              >
                {saving ? "Zapisywanie..." : "Zapisz płatność"}
              </PremiumButton>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Referencja / numer transakcji
              </span>
              <input
                value={externalRef}
                onChange={(event) => setExternalRef(event.target.value)}
                placeholder="np. przelew bankowy, TWINT, gotówka"
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                Notatka
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="np. wpłata częściowa, klient zapłacił gotówką"
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400"
              />
            </label>
          </div>

          {selectedInvoice ? (
            <div className="mt-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              <p className="font-bold">{invoiceLabel(selectedInvoice)}</p>
              <p className="mt-1 text-cyan-100/75">
                Total: {formatMoney(selectedInvoice.total, selectedInvoice.currency ?? "CHF")} ·
                Zapłacono:{" "}
                {formatMoney(selectedInvoice.paidAmount, selectedInvoice.currency ?? "CHF")} ·
                Pozostało:{" "}
                {formatMoney(selectedRemaining, selectedInvoice.currency ?? "CHF")}
              </p>
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-3xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
              {errorMessage}
            </div>
          ) : null}
        </DashboardPanel>

        {loading ? (
          <DashboardPanel
            title="Ładowanie płatności"
            description="HEXA OS pobiera aktualne dane z modułu Payments."
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

        {!loading ? (
          <DashboardPanel
            title="Lista płatności"
            description={`Liczba rekordów: ${payments.length}. Płatność aktualizuje fakturę i zamyka etap finansowy procesu.`}
            action={
              <StatusBadge
                status={payments.length > 0 ? "ACCEPTED" : "PENDING"}
                label={
                  payments.length > 0 ? "Płatności aktywne" : "Brak płatności"
                }
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={payments}
              getRowKey={(payment) => payment.id}
              empty={
                <EmptyState
                  title="Brak płatności w bazie"
                  description="Pierwsza płatność pojawi się tutaj po utworzeniu jej z faktury."
                  actionLabel="Przejdź do faktur"
                  actionHref="/dashboard/invoices"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        <DashboardPanel
          title="Zasada rozliczenia"
          description="Payment jest oddzielnym rekordem historii wpłat. Faktura trzyma sumę paidAmount i status płatności."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm font-black text-cyan-100">1. Wybierz fakturę</p>
              <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                System pokazuje total, zapłacono i kwotę pozostałą.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
              <p className="text-sm font-black text-violet-100">2. Wpisz wpłatę</p>
              <p className="mt-2 text-sm leading-6 text-violet-100/70">
                Możesz dodać przelew, gotówkę, TWINT, kartę albo inną metodę.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm font-black text-emerald-100">3. Faktura się aktualizuje</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                Po pełnej wpłacie status faktury przechodzi na PAID.
              </p>
            </div>
          </div>
        </DashboardPanel>

        <div className="flex justify-end">
          <Link
            href="/dashboard/invoices"
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07]"
          >
            Wróć do faktur
          </Link>
        </div>
      </section>
    </main>
  );
}