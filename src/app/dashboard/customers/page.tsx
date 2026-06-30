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

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardCustomersResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    customers: Customer[];
  };
};

function formatDate(value?: string) {
  if (!value) return "brak daty";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getCustomerName(customer: Customer) {
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.name ||
    fullName ||
    customer.email ||
    customer.phone ||
    customer.id
  );
}

function getCustomerLocation(customer: Customer) {
  return [customer.postalCode, customer.city].filter(Boolean).join(" ") || "—";
}

function getCustomerAddress(customer: Customer) {
  return [customer.address, customer.postalCode, customer.city]
    .filter(Boolean)
    .join(", ");
}

function hasContactData(customer: Customer) {
  return Boolean(customer.email || customer.phone);
}

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/customers", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard Customers API returned an error");
      }

      const json: DashboardCustomersResponse = await response.json();

      setCustomers(json.data.customers ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown customers error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const stats = useMemo(() => {
    const withEmail = customers.filter((customer) => customer.email).length;
    const withPhone = customers.filter((customer) => customer.phone).length;
    const withAddress = customers.filter(
      (customer) => customer.address || customer.city || customer.postalCode
    ).length;
    const completeProfiles = customers.filter(
      (customer) =>
        hasContactData(customer) &&
        (customer.address || customer.city || customer.postalCode)
    ).length;

    return {
      total: customers.length,
      withEmail,
      withPhone,
      withAddress,
      completeProfiles,
    };
  }, [customers]);

  const latestCustomers = useMemo(() => {
    return customers.slice(0, 4).map((customer) => ({
      id: customer.id,
      title: getCustomerName(customer),
      description:
        getCustomerAddress(customer) ||
        customer.email ||
        customer.phone ||
        "Brak pełnych danych kontaktowych",
      status: hasContactData(customer) ? "ACCEPTED" : "PENDING",
      time: formatDate(customer.createdAt),
    }));
  }, [customers]);

  const columns: DashboardTableColumn<Customer>[] = [
    {
      key: "customer",
      header: "Klient",
      render: (customer) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {getCustomerName(customer)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {customer.id}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontakt",
      render: (customer) => (
        <div className="space-y-1">
          <p className="font-semibold text-zinc-200">
            {customer.email ?? "Brak emaila"}
          </p>
          <p className="text-sm text-zinc-500">
            {customer.phone ?? "Brak telefonu"}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Miasto",
      render: (customer) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {getCustomerLocation(customer)}
          </p>
          {customer.address ? (
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              {customer.address}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "profile",
      header: "Profil",
      render: (customer) => (
        <StatusBadge
          status={hasContactData(customer) ? "ACCEPTED" : "PENDING"}
          label={hasContactData(customer) ? "Kontakt OK" : "Uzupełnić"}
        />
      ),
    },
    {
      key: "created",
      header: "Dodano",
      render: (customer) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(customer.createdAt)}
        </p>
      ),
    },
    {
      key: "action",
      header: "Akcja",
      className: "text-right",
      render: (customer) => (
        <div className="flex justify-end">
          <PremiumButton
            href={`/dashboard/customers/${customer.id}`}
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
          eyebrow="HEXA OS CRM / Customers"
          title="Baza klientów"
          description="Centralne miejsce dla klientów HEXA OS: dane kontaktowe, lokalizacje, historia zleceń i przyszłe powiązanie z wycenami, ofertami oraz fakturami."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadCustomers}
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
            title="Wszyscy klienci"
            value={String(stats.total)}
            description="Łączna liczba klientów zapisanych w bazie."
            trend="Źródło: Customers API"
            tone="cyan"
            icon={<span className="text-lg font-black">CRM</span>}
          />

          <MetricCard
            title="Z emailem"
            value={String(stats.withEmail)}
            description="Klienci gotowi pod wysyłkę ofert i faktur."
            trend="Email automation"
            tone="violet"
            icon={<span className="text-lg font-black">@</span>}
          />

          <MetricCard
            title="Z telefonem"
            value={String(stats.withPhone)}
            description="Kontakty pod rozmowy telefoniczne i SMS."
            trend="SMS / phone workflow"
            tone="amber"
            icon={<span className="text-lg font-black">☎</span>}
          />

          <MetricCard
            title="Pełne profile"
            value={String(stats.completeProfiles)}
            description="Klienci z kontaktem oraz lokalizacją."
            trend="Gotowe do zleceń"
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Ładowanie klientów"
            description="HEXA OS pobiera aktualne dane z modułu Customers."
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
            title="Błąd modułu Customers"
            description="Nie udało się pobrać listy klientów z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/customers oraz połączenie z
                bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <DashboardPanel
              title="Lista klientów"
              description={`Liczba rekordów: ${customers.length}. Klienci są fundamentem pod zlecenia, wyceny, oferty, faktury i historię CRM.`}
              action={
                <StatusBadge
                  status={customers.length > 0 ? "ACCEPTED" : "PENDING"}
                  label={customers.length > 0 ? "Baza aktywna" : "Brak danych"}
                />
              }
            >
              <DashboardTable
                columns={columns}
                rows={customers}
                getRowKey={(customer) => customer.id}
                empty={
                  <EmptyState
                    title="Brak klientów w bazie"
                    description="Pierwszy klient pojawi się tutaj po dodaniu zlecenia telefonicznego, formularza kontaktowego albo zapytania z AI Concierge."
                    actionLabel="Wróć do overview"
                    actionHref="/dashboard"
                  />
                }
              />
            </DashboardPanel>

            <DashboardPanel
              title="Ostatni klienci"
              description="Szybki podgląd najnowszych kontaktów w module CRM."
            >
              <ActivityTimeline
                items={latestCustomers}
                emptyTitle="Brak ostatnich klientów"
                emptyDescription="Po dodaniu klientów zobaczysz tutaj najnowsze kontakty."
              />
            </DashboardPanel>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola modułu Customers"
            description="Ten moduł będzie później łączył dane z telefonu, formularza, AI Concierge, wycen, ofert, faktur i płatności."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Dane kontaktowe
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Email i telefon będą używane do wysyłki wycen, faktur oraz
                  powiadomień.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Historia klienta
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Klient będzie miał powiązane zlecenia, wyceny, oferty,
                  faktury i płatności.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Silnik MM Digital Core
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Ten sam model klientów będzie później działał dla innych firm
                  jako tenant SaaS.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}