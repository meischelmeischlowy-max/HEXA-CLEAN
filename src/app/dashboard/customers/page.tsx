"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ActionStatusBadge from "../../../components/dashboard/ActionStatusBadge";
import EmptyState from "../../../components/dashboard/EmptyState";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import {
  getCustomerListAction,
  hasCustomerCompleteAddress,
  hasCustomerContact,
} from "../../../lib/dashboard/next-action";

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
    "Unbenannter Kunde"
  );
}

function getCustomerLocation(customer: Customer) {
  const zipValue = customer.zipCode || customer.postalCode;
  return [zipValue, customer.city].filter(Boolean).join(" ") || "-";
}

function getCustomerAddress(customer: Customer) {
  return customer.street || customer.address || "";
}

function customerTypeLabel(customer: Customer) {
  if (customer.type === "COMPANY" || customer.companyName) {
    return "Firma";
  }

  return "Privatkunde";
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
    const timeoutId = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCustomers]);

  const stats = useMemo(() => {
    const completeProfiles = customers.filter(
      (customer) =>
        hasCustomerContact(customer) && hasCustomerCompleteAddress(customer),
    ).length;

    const missingAddress = customers.filter(
      (customer) =>
        hasCustomerContact(customer) && !hasCustomerCompleteAddress(customer),
    ).length;

    const missingContact = customers.filter(
      (customer) => !hasCustomerContact(customer),
    ).length;

    return {
      total: customers.length,
      completeProfiles,
      missingAddress,
      missingContact,
    };
  }, [customers]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-none flex-col gap-5">
        <PageHeader
          eyebrow="HEXA OS CRM / Kunden"
          title="Kunden"
          description="Kundenbasis. Status anklicken, dann öffnet sich der konkrete Kunde mit der passenden Aktion. Keine Rechnungs-, Offerten- oder Auftragsaktionen auf der Liste."
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
        </PageHeader>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Kunden
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {stats.total}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
              Vollständig
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-100">
              {stats.completeProfiles}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/70">
              Adresse fehlt
            </p>
            <p className="mt-2 text-2xl font-black text-amber-100">
              {stats.missingAddress}
            </p>
          </div>

          <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-200/70">
              Kontakt fehlt
            </p>
            <p className="mt-2 text-2xl font-black text-rose-100">
              {stats.missingContact}
            </p>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-black text-white">
              Kunden werden geladen
            </p>
            <div className="mt-4 grid gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
            <p className="font-black">Fehler im Kundenmodul</p>
            <p className="mt-2 text-sm leading-6 text-red-100/70">
              {errorMessage}
            </p>
          </section>
        ) : null}

        {!loading && !errorMessage && customers.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <EmptyState
              title="Keine Kunden in der Datenbank"
              description="Erstellen Sie den ersten Kunden manuell oder später über Formular, Auftrag oder KI-Concierge."
              actionLabel="Kunde erstellen"
              actionHref="/dashboard/customers/new"
            />
          </section>
        ) : null}

        {!loading && !errorMessage && customers.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Kundenliste</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Status ist die Aktion. Öffnen/Bearbeiten bleibt nur für den
                  Kundendatensatz.
                </p>
              </div>

              <ActionStatusBadge
                tone="green"
                label="Daten aktiv"
                title="Kundenmodul aktiv"
              />
            </div>

            <div className="divide-y divide-white/10">
              {customers.map((customer) => {
                const action = getCustomerListAction(customer);

                return (
                  <article
                    key={customer.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(190px,1fr)_minmax(180px,0.8fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="block truncate text-base font-black text-white transition hover:text-cyan-200"
                      >
                        {getCustomerName(customer)}
                      </Link>

                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
                        {customerTypeLabel(customer)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-200">
                        {customer.email ?? "Keine E-Mail"}
                      </p>
                      <p className="mt-1 truncate text-sm text-zinc-500">
                        {customer.phone ?? "Kein Telefon"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-200">
                        {getCustomerLocation(customer)}
                      </p>

                      {getCustomerAddress(customer) ? (
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {getCustomerAddress(customer)}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-600">
                          Keine Adresse
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <ActionStatusBadge
                        href={action.href}
                        tone={action.tone}
                        label={action.label}
                        title={action.description}
                      />
                      <p className="text-xs text-zinc-500">
                        Erstellt: {formatDate(customer.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/20"
                      >
                        Öffnen
                      </Link>

                      <Link
                        href={`/dashboard/customers/${customer.id}/edit`}
                        className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/[0.08]"
                      >
                        Bearbeiten
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}