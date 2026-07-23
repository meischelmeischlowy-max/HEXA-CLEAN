"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  if (!value) {
    return "Kein Datum";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kein Datum";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function getCustomerName(customer: Customer) {
  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
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
  const zipValue =
    customer.zipCode ||
    customer.postalCode;

  return (
    [zipValue, customer.city]
      .filter(Boolean)
      .join(" ") ||
    "Kein Ort"
  );
}

function getCustomerAddress(customer: Customer) {
  return (
    customer.street ||
    customer.address ||
    "Keine Adresse"
  );
}

function customerTypeLabel(customer: Customer) {
  if (
    customer.type === "COMPANY" ||
    customer.companyName
  ) {
    return "Firma";
  }

  return "Privatkunde";
}

function customerProfileStatus(customer: Customer) {
  if (!hasCustomerContact(customer)) {
    return {
      label: "Kontakt fehlt",
      className:
        "border-red-300/25 bg-red-300/10 text-red-100",
      priority: 0,
    };
  }

  if (!hasCustomerCompleteAddress(customer)) {
    return {
      label: "Adresse fehlt",
      className:
        "border-amber-300/25 bg-amber-300/10 text-amber-100",
      priority: 1,
    };
  }

  return {
    label: "Vollständig",
    className:
      "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    priority: 2,
  };
}

function customerTimestamp(customer: Customer) {
  const value =
    customer.updatedAt ??
    customer.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/dashboard/customers",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Die Kunden konnten nicht geladen werden.",
        );
      }

      const json =
        (await response.json()) as DashboardCustomersResponse;

      setCustomers(
        json.data?.customers ?? [],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Kunden konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCustomers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadCustomers]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((left, right) => {
      const priorityDifference =
        customerProfileStatus(left).priority -
        customerProfileStatus(right).priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        customerTimestamp(right) -
        customerTimestamp(left)
      );
    });
  }, [customers]);

  const stats = useMemo(() => {
    return customers.reduce(
      (result, customer) => {
        const status =
          customerProfileStatus(customer);

        if (status.label === "Vollständig") {
          result.complete += 1;
        }

        if (status.label === "Adresse fehlt") {
          result.missingAddress += 1;
        }

        if (status.label === "Kontakt fehlt") {
          result.missingContact += 1;
        }

        return result;
      },
      {
        complete: 0,
        missingAddress: 0,
        missingContact: 0,
      },
    );
  }, [customers]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Kunden
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Kunden
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Kundendaten prüfen. Unvollständige Profile stehen zuerst.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadCustomers}
                disabled={loading}
              >
                Aktualisieren
              </PremiumButton>

              <PremiumButton
                href="/dashboard/customers/new"
                variant="primary"
                size="sm"
              >
                Kunde erstellen
              </PremiumButton>
            </div>
          </div>

          <div
            data-testid="customers-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {customers.length} gesamt
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.complete} vollständig
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.missingAddress} ohne Adresse
            </span>

            <span className="rounded-lg border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-100">
              {stats.missingContact} ohne Kontakt
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="customers-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Kundenstamm
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Fehlende Kontakt- oder Adressdaten werden priorisiert.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedCustomers.length} Positionen
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
          sortedCustomers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Kunden vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Der erste Kunde entsteht über QuickOffer, Chat oder manuelle Erfassung.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedCustomers.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedCustomers.map((customer) => {
                const profile =
                  customerProfileStatus(customer);

                const action =
                  getCustomerListAction(customer);

                return (
                  <article
                    key={customer.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(210px,1.15fr)_minmax(220px,1fr)_minmax(210px,0.9fr)_130px_120px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {getCustomerName(customer)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                        {customerTypeLabel(customer)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-100">
                        {customer.email ??
                          "Keine E-Mail"}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {customer.phone ??
                          "Kein Telefon"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-100">
                        {getCustomerLocation(customer)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {getCustomerAddress(customer)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${profile.className}`}
                      >
                        {profile.label}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Erstellt
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                        {formatDate(customer.createdAt)}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={action.href}
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