"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityTimeline from "../../../components/dashboard/ActivityTimeline";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DashboardTable, {
  type DashboardTableColumn,
} from "../../../components/dashboard/DashboardTable";
import EmptyState from "../../../components/dashboard/EmptyState";
import MetricCard from "../../../components/dashboard/MetricCard";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../components/dashboard/StatusBadge";

type Payment = {
  id: string;
  invoiceId?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  method?: string | null;
  provider?: string | null;
  transactionId?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardPaymentsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    payments: Payment[];
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
    STRIPE: "Stripe",
    MANUAL: "Ręcznie",
  };

  return labels[method.toUpperCase()] ?? method;
}

function getPaymentTitle(payment: Payment) {
  return payment.transactionId ?? payment.id;
}

export default function DashboardPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown payments error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const stats = useMemo(() => {
    const pending = payments.filter(
      (payment) => normalizeStatus(payment.status) === "PENDING"
    ).length;

    const paid = payments.filter(
      (payment) => normalizeStatus(payment.status) === "PAID"
    ).length;

    const failed = payments.filter((payment) =>
      ["FAILED", "CANCELLED", "CANCELED"].includes(
        normalizeStatus(payment.status)
      )
    ).length;

    const totalValue = payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount);
      return amount === null ? sum : sum + amount;
    }, 0);

    const paidValue = payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount);

      if (amount === null) {
        return sum;
      }

      return normalizeStatus(payment.status) === "PAID" ? sum + amount : sum;
    }, 0);

    const pendingValue = payments.reduce((sum, payment) => {
      const amount = toNumber(payment.amount);

      if (amount === null) {
        return sum;
      }

      return normalizeStatus(payment.status) === "PENDING" ? sum + amount : sum;
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

  const latestPayments = useMemo(() => {
    return payments.slice(0, 4).map((payment) => ({
      id: payment.id,
      title: getPaymentTitle(payment),
      description: `${formatMoney(
        payment.amount,
        payment.currency ?? "CHF"
      )} · ${formatPaymentMethod(payment.method)} · faktura: ${
        payment.invoiceId ?? "—"
      }`,
      status: payment.status ?? "PENDING",
      time: payment.paidAt
        ? `Zapłacono: ${formatDate(payment.paidAt)}`
        : `Dodano: ${formatDate(payment.createdAt)}`,
    }));
  }, [payments]);

  const columns: DashboardTableColumn<Payment>[] = [
    {
      key: "payment",
      header: "Płatność",
      render: (payment) => (
        <div>
          <p className="max-w-xs truncate font-black tracking-tight text-white">
            {getPaymentTitle(payment)}
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
            Provider: {payment.provider ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "invoice",
      header: "Faktura",
      render: (payment) => (
        <p className="max-w-xs truncate font-semibold text-zinc-200">
          {payment.invoiceId ?? "—"}
        </p>
      ),
    },
    {
      key: "transaction",
      header: "Transakcja",
      render: (payment) => (
        <p className="max-w-xs truncate text-sm font-medium text-zinc-400">
          {payment.transactionId ?? "—"}
        </p>
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
        <div className="flex justify-end">
          <PremiumButton
            href={`/dashboard/payments/${payment.id}`}
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
          eyebrow="HEXA OS CRM / Payments"
          title="Płatności"
          description="Moduł płatności zamyka finansowy workflow: faktura, płatność oczekująca, oznaczenie jako opłacone i aktualizacja statusu faktury."
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

        {errorMessage ? (
          <DashboardPanel
            title="Błąd modułu Payments"
            description="Nie udało się pobrać listy płatności z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/payments oraz połączenie z
                bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
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

            <DashboardPanel
              title="Ostatnie płatności"
              description="Szybki podgląd najnowszych operacji finansowych."
            >
              <ActivityTimeline
                items={latestPayments}
                emptyTitle="Brak ostatnich płatności"
                emptyDescription="Po utworzeniu płatności zobaczysz tutaj najnowszą aktywność."
              />
            </DashboardPanel>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola modułu Payments"
            description="Docelowo ten moduł będzie obsługiwał ręczne płatności, przelewy bankowe, TWINT, statusy transakcji i późniejszą automatyzację przypomnień."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Faktura → płatność
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Płatność powstaje z faktury i przejmuje jej kwotę oraz walutę.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Kontrola statusu
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Status PENDING przechodzi w PAID po oznaczeniu płatności jako
                  opłaconej.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Zamknięcie workflow
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Opłacona płatność aktualizuje fakturę i pozwala zamknąć
                  zlecenie.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}