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

type Customer = {
  id: string;
  type?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  postalCode?: string | null;
  country?: string | null;
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

function getCustomerName(customer: Customer) {
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.companyName ||
    customer.name ||
    fullName ||
    customer.email ||
    customer.phone ||
    customer.id
  );
}

function getCustomerLocation(customer: Customer) {
  const zipValue = customer.zipCode || customer.postalCode;
  return [zipValue, customer.city].filter(Boolean).join(" ") || "—";
}

function getCustomerAddress(customer: Customer) {
  return customer.street || customer.address || "";
}

function hasContactData(customer: Customer) {
  return Boolean(customer.email || customer.phone);
}

function hasLocationData(customer: Customer) {
  return Boolean(
    customer.street ||
      customer.address ||
      customer.city ||
      customer.zipCode ||
      customer.postalCode,
  );
}

function customerProfileLabel(customer: Customer) {
  if (hasContactData(customer) && hasLocationData(customer)) {
    return "Profil vollständig";
  }

  if (hasContactData(customer)) {
    return "Adressese fehlt";
  }

  return "Ergänzen";
}

function customerProfileStatus(customer: Customer) {
  if (hasContactData(customer) && hasLocationData(customer)) {
    return "ACCEPTED";
  }

  if (hasContactData(customer)) {
    return "PENDING";
  }

  return "REJECTED";
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
        throw new Error("Die Kunden-API hat einen Fehler zurückgegeben.");
      }

      const json: DashboardCustomersResponse = await response.json();

      setCustomers(json.data.customers ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unbekannter Kundenfehler.",
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
    const completeProfiles = customers.filter(
      (customer) => hasContactData(customer) && hasLocationData(customer),
    ).length;

    const companies = customers.filter(
      (customer) => customer.type === "COMPANY" || customer.companyName,
    ).length;

    return {
      total: customers.length,
      withEmail,
      withPhone,
      completeProfiles,
      companies,
    };
  }, [customers]);

  const columns: DashboardTableColumn<Customer>[] = [
    {
      key: "customer",
      header: "Kunde",
      render: (customer) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {getCustomerName(customer)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">ID: {customer.id}</p>
          {customer.type ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
              {customer.type === "COMPANY" ? "Firma" : "Privatkunde"}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontakt",
      render: (customer) => (
        <div className="space-y-1">
          <p className="font-semibold text-zinc-200">
            {customer.email ?? "Keine E-Mail"}
          </p>
          <p className="text-sm text-zinc-500">
            {customer.phone ?? "Kein Telefon"}
          </p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Ort / Adressese",
      render: (customer) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {getCustomerLocation(customer)}
          </p>
          {getCustomerAddress(customer) ? (
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              {getCustomerAddress(customer)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">Keine Adressese</p>
          )}
        </div>
      ),
    },
    {
      key: "profile",
      header: "Profil",
      render: (customer) => (
        <StatusBadge
          status={customerProfileStatus(customer)}
          label={customerProfileLabel(customer)}
        />
      ),
    },
    {
      key: "created",
      header: "Erstellt",
      render: (customer) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(customer.createdAt)}
        </p>
      ),
    },
    {
      key: "action",
      header: "Aktionen",
      className: "text-right",
      render: (customer) => (
        <div className="flex flex-wrap justify-end gap-2">
          <PremiumButton
            href={`/dashboard/customers/${customer.id}`}
            variant="primary"
            size="sm"
          >
            Öffnen
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/customers/${customer.id}/edit`}
            variant="secondary"
            size="sm"
          >
            Bearbeiten
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/invoices?customerId=${customer.id}`}
            variant="secondary"
            size="sm"
          >
            Rechnungen
          </PremiumButton>

          <PremiumButton
            href={`/dashboard/orders?customerId=${customer.id}`}
            variant="ghost"
            size="sm"
          >
            Aufträge
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Kunden"
          title="Kundendatenbank"
          description="Zentrale Übersicht für Kunden, Kontaktdaten, Standorte, Aufträge, Angebote, Rechnungen und Zahlungen."
        >
          <PremiumButton href="/dashboard/customers/new" variant="primary">
            Kunde erstellen
          </PremiumButton>

          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadCustomers}
            disabled={loading}
          >
            Aktualisieren
          </PremiumButton>

          <PremiumButton href="/dashboard/orders" variant="ghost">
            Aufträge
          </PremiumButton>

          <PremiumButton href="/dashboard/invoices" variant="ghost">
            Rechnungen
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Alle Kunden"
            value={String(stats.total)}
            description="Gesamtzahl der Kunden in der Datenbank."
            trend={`${stats.companies} Firmen`}
            tone="cyan"
            icon={<span className="text-lg font-black">CRM</span>}
          />

          <MetricCard
            title="Mit E-Mail"
            value={String(stats.withEmail)}
            description="Kunden, die für Angebote und Rechnungen per E-Mail erreichbar sind."
            trend="E-Mail Automation"
            tone="violet"
            icon={<span className="text-lg font-black">@</span>}
          />

          <MetricCard
            title="Mit Telefon"
            value={String(stats.withPhone)}
            description="Kunden mit Telefonnummer für Rückfragen und SMS."
            trend="Telefon / SMS"
            tone="amber"
            icon={<span className="text-lg font-black">☎</span>}
          />

          <MetricCard
            title="Vollständige Profile"
            value={String(stats.completeProfiles)}
            description="Kunden mit Kontakt- und Adressesdaten."
            trend="Bereit für Aufträge"
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Kunden werden geladen"
            description="HEXA OS lädt die aktuellen Kundendaten aus dem CRM."
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
            title="Fehler im Kundenmodul"
            description="Die Kundenliste konnte nicht aus der API geladen werden."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Fehler: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Prüfen Sie den Endpoint /api/dashboard/customers und die
                Datenbankverbindung.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Kundenliste"
            description={`Anzahl Datensätze: ${customers.length}. Kunden sind die Basis für Aufträge, Angebote, Rechnungen und CRM-Historie.`}
            action={
              <StatusBadge
                status={customers.length > 0 ? "ACCEPTED" : "PENDING"}
                label={customers.length > 0 ? "Daten aktiv" : "Keine Daten"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={customers}
              getRowKey={(customer) => customer.id}
              empty={
                <EmptyState
                  title="Keine Kunden in der Datenbank"
                  description="Erstellen Sie den ersten Kunden manuell oder später über Formular, Auftrag oder AI Concierge."
                  actionLabel="Kunde erstellen"
                  actionHref="/dashboard/customers/new"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rolle des Kundenmoduls"
            description="Dieses Modul verbindet Telefon, Formular, AI Concierge, Aufträge, Angebote, Rechnungen und Zahlungen."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Kontaktdaten
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  E-Mail und Telefon werden für Angebote, Rechnungen und
                  Benachrichtigungen verwendet.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Kundenhistorie
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Jeder Kunde kann mit Aufträgen, Angeboten, Rechnungen und
                  Zahlungen verbunden werden.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Schnelle CRM-Aktionen
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Aus der Kundenliste gelangen Sie direkt zu Details, Bearbeitung,
                  Rechnungen und Aufträgen.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}