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

type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  number?: string | null;
  status?: string | null;
  subtotal?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  currency?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardInvoicesResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    invoices: Invoice[];
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

function getInvoiceNumber(invoice: Invoice) {
  return invoice.invoiceNumber ?? invoice.number ?? invoice.id;
}

function normalizeStatus(status?: string | null) {
  return status?.toUpperCase() ?? "UNKNOWN";
}

function getOutstandingAmount(invoice: Invoice) {
  const total = toNumber(invoice.total);
  const paid = toNumber(invoice.paidAmount) ?? 0;

  if (total === null) {
    return null;
  }

  return Math.max(total - paid, 0);
}

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate) return false;
  if (normalizeStatus(invoice.status) === "PAID") return false;

  const dueDate = new Date(invoice.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  return dueDate.getTime() < Date.now();
}

function getDisplayStatus(invoice: Invoice) {
  if (isOverdue(invoice)) {
    return "OVERDUE";
  }

  return invoice.status ?? "DRAFT";
}

export default function DashboardInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/invoices", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard Invoices API returned an error");
      }

      const json: DashboardInvoicesResponse = await response.json();

      setInvoices(json.data.invoices ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown invoices error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const stats = useMemo(() => {
    const draft = invoices.filter(
      (invoice) => normalizeStatus(invoice.status) === "DRAFT"
    ).length;

    const sent = invoices.filter(
      (invoice) => normalizeStatus(invoice.status) === "SENT"
    ).length;

    const paid = invoices.filter(
      (invoice) => normalizeStatus(invoice.status) === "PAID"
    ).length;

    const overdue = invoices.filter((invoice) => isOverdue(invoice)).length;

    const totalValue = invoices.reduce((sum, invoice) => {
      const amount = toNumber(invoice.total);
      return amount === null ? sum : sum + amount;
    }, 0);

    const paidValue = invoices.reduce((sum, invoice) => {
      const amount = toNumber(invoice.paidAmount);
      return amount === null ? sum : sum + amount;
    }, 0);

    const openValue = Math.max(totalValue - paidValue, 0);

    return {
      total: invoices.length,
      draft,
      sent,
      paid,
      overdue,
      totalValue,
      paidValue,
      openValue,
    };
  }, [invoices]);

  const columns: DashboardTableColumn<Invoice>[] = [
    {
      key: "invoice",
      header: "Faktura",
      render: (invoice) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {getInvoiceNumber(invoice)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {invoice.id}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (invoice) => <StatusBadge status={getDisplayStatus(invoice)} />,
    },
    {
      key: "subtotal",
      header: "Subtotal",
      render: (invoice) => (
        <p className="font-semibold text-zinc-200">
          {formatMoney(invoice.subtotal, invoice.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "tax",
      header: "Podatek",
      render: (invoice) => (
        <p className="font-semibold text-zinc-200">
          {formatMoney(invoice.taxAmount, invoice.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (invoice) => (
        <p className="font-black text-emerald-100">
          {formatMoney(invoice.total, invoice.currency ?? "CHF")}
        </p>
      ),
    },
    {
      key: "paid",
      header: "Zapłacono",
      render: (invoice) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {formatMoney(invoice.paidAmount, invoice.currency ?? "CHF")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Otwarte:{" "}
            {formatMoney(getOutstandingAmount(invoice), invoice.currency ?? "CHF")}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Termin",
      render: (invoice) => (
        <div>
          <p className="text-sm font-medium text-zinc-400">
            {formatDate(invoice.dueDate)}
          </p>
          {isOverdue(invoice) ? (
            <p className="mt-1 text-xs font-bold text-red-200">
              Po terminie
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "created",
      header: "Dodano",
      render: (invoice) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(invoice.createdAt)}
        </p>
      ),
    },
    {
      key: "action",
      header: "Akcje",
      className: "text-right",
      render: (invoice) => (
        <div className="flex flex-wrap justify-end gap-2">
          <PremiumButton
            href={`/dashboard/invoices/${invoice.id}`}
            variant="primary"
            size="sm"
          >
            Szczegóły
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/invoices/${invoice.id}/edit`}
            variant="secondary"
            size="sm"
          >
            Edytuj
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/invoices/${invoice.id}/print`}
            variant="ghost"
            size="sm"
          >
            Drukuj
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Invoices"
          title="Faktury"
          description="Moduł faktur kontroluje dokumenty sprzedaży, status wysyłki, terminy płatności, kwoty opłacone i przejście do płatności."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadInvoices}
            disabled={loading}
          >
            Odśwież
          </PremiumButton>
          <PremiumButton href="/dashboard/quotes" variant="ghost">
            Oferty
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Wszystkie faktury"
            value={String(stats.total)}
            description="Łączna liczba faktur zapisanych w bazie."
            trend="Źródło: Invoices API"
            tone="cyan"
            icon={<span className="text-lg font-black">INV</span>}
          />

          <MetricCard
            title="Wysłane"
            value={String(stats.sent)}
            description="Faktury przekazane klientowi do zapłaty."
            trend="Status SENT"
            tone="violet"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="Opłacone"
            value={String(stats.paid)}
            description="Faktury oznaczone jako zapłacone."
            trend={formatMoney(stats.paidValue, "CHF")}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />

          <MetricCard
            title="Otwarte saldo"
            value={formatMoney(stats.openValue, "CHF")}
            description={`Po terminie: ${stats.overdue}. Szkice: ${stats.draft}.`}
            trend="Kontrola płatności"
            tone={stats.overdue > 0 ? "red" : "amber"}
            icon={<span className="text-lg font-black">CHF</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Ładowanie faktur"
            description="HEXA OS pobiera aktualne dane z modułu Invoices."
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
            title="Błąd modułu Invoices"
            description="Nie udało się pobrać listy faktur z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/invoices oraz połączenie z
                bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Lista faktur"
            description={`Liczba rekordów: ${invoices.length}. Faktura powstaje po zaakceptowanej ofercie i prowadzi dalej do płatności.`}
            action={
              <StatusBadge
                status={invoices.length > 0 ? "ACCEPTED" : "PENDING"}
                label={invoices.length > 0 ? "Faktury aktywne" : "Brak faktur"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={invoices}
              getRowKey={(invoice) => invoice.id}
              empty={
                <EmptyState
                  title="Brak faktur w bazie"
                  description="Pierwsza faktura pojawi się tutaj po utworzeniu jej z zaakceptowanej oferty."
                  actionLabel="Przejdź do ofert"
                  actionHref="/dashboard/quotes"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola modułu Invoices"
            description="Faktury będą docelowo generowane jako PDF z logo, danymi firmy, statusem DRAFT/SENT/PAID i pełnym zapisem w historii systemu."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  PDF z logo
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Faktura jako dokument PDF z brandingiem HEXA CLEAN.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Edycja przed wysyłką
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Fakturę trzeba móc ręcznie poprawić przed wydrukiem albo
                  wysyłką do klienta.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Kontrola płatności
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Po płatności system oznacza fakturę jako PAID i zamyka etap
                  finansowy workflow.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}