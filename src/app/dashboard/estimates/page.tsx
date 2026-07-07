"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EstimateCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Estimate = {
  id: string;
  estimateNumber?: string | null;
  title?: string | null;
  status?: string | null;
  source?: string | null;
  currency?: string | null;
  subtotal?: string | number | null;
  riskAmount?: string | number | null;
  travelFee?: string | number | null;
  discountAmount?: string | number | null;
  total?: string | number | null;
  aiMinTotal?: string | number | null;
  aiMaxTotal?: string | number | null;
  serviceCity?: string | null;
  serviceStreet?: string | null;
  serviceZipCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: EstimateCustomer | null;
  items?: unknown[];
};

type EstimatesResponse = {
  layer?: string;
  message?: string;
  data?: {
    status?: string;
    message?: string;
    estimates?: Estimate[];
  };
  estimates?: Estimate[];
};

function formatMoney(value: string | number | null | undefined, currency = "CHF") {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function customerName(customer?: EstimateCustomer | null) {
  if (!customer) {
    return "Demo-Kunde";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return fullName || "Demo-Kunde";
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    AI_REVIEW: "KI-Prüfung",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Prüfung durch Inhaber",
    READY_TO_SEND: "Versandbereit",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    EXPIRED: "Abgelaufen",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function getEstimatesFromResponse(response: EstimatesResponse): Estimate[] {
  if (Array.isArray(response.data?.estimates)) {
    return response.data.estimates;
  }

  if (Array.isArray(response.estimates)) {
    return response.estimates;
  }

  return [];
}

export default function DashboardEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const totalValue = estimates.reduce((sum, estimate) => {
      const value = Number(estimate.total ?? 0);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);

    return {
      count: estimates.length,
      totalValue,
    };
  }, [estimates]);

  async function loadEstimates() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as EstimatesResponse;

      if (!response.ok) {
        throw new Error(
          data.message ?? data.data?.message ?? "Die Kalkulationen konnten nicht geladen werden."
        );
      }

      setEstimates(getEstimatesFromResponse(data));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Laden der Kalkulationen."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function createDemoEstimate() {
    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as EstimatesResponse;

      if (!response.ok) {
        throw new Error(
          data.message ?? data.data?.message ?? "Die Demo-Kalkulation konnte nicht erstellt werden."
        );
      }

      await loadEstimates();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Kalkulation."
      );
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    void loadEstimates();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Kalkulationen
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Kalkulationen
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Liste von Entwurfs- und versendeten Kalkulationen. Demo-Kalkulationen dienen nur zum Testen des Systems, der Datenbankverbindung und der Detailansicht.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/estimates/new"
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-neutral-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200"
              >
                Neue Kalkulation
              </Link>

              <button
                type="button"
                onClick={createDemoEstimate}
                disabled={isCreating}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-neutral-100 shadow-lg shadow-black/20 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Wird erstellt..." : "Demo-Kalkulation hinzufügen"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Anzahl Kalkulationen</p>
            <p className="mt-2 text-3xl font-black">{totals.count}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Gesamtsumme</p>
            <p className="mt-2 text-3xl font-black">
              {formatMoney(totals.totalValue, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-100/70">Uwaga</p>
            <p className="mt-2 text-sm leading-6 text-amber-100">
              Die Preise sind testweise/robust. Sie dürfen nicht als echter
              Preislistenwert für Kunden gelten, ohne Freigabe durch den Inhaber.
            </p>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kalkulationsliste</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Klicken Sie auf die Nummer oder auf „Details“, um eine einzelne
                Kalkulation zu öffnen.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/estimates/new"
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              >
                Neue Kalkulation
              </Link>

              <button
                type="button"
                onClick={loadEstimates}
                disabled={isLoading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Aktualisieren..." : "Aktualisieren"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-neutral-400">
              Kalkulationen werden geladen...
            </div>
          ) : null}

          {!isLoading && estimates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Keine Kalkulationen vorhanden. Klicken Sie auf „Neue Kalkulation“, um die erste manuelle Kalkulation zu erstellen, oder auf „Demo-Kalkulation hinzufügen“, um einen Testeintrag anzulegen.
            </div>
          ) : null}

          {!isLoading && estimates.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                      <th className="px-4 py-4">Nummer</th>
                    <th className="px-4 py-4">Kunde</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Ort</th>
                    <th className="px-4 py-4">Erstellt</th>
                    <th className="px-4 py-4 text-right">Gesamt</th>
                    <th className="px-4 py-4 text-right">Aktion</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {estimates.map((estimate) => (
                    <tr key={estimate.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/estimates/${estimate.id}`}
                          className="font-black text-cyan-300 hover:text-cyan-200"
                        >
                          {estimate.estimateNumber ?? estimate.id}
                        </Link>
                        <p className="mt-1 text-xs text-neutral-500">
                          {estimate.title ?? "Entwurfskalkulation"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        <p className="font-semibold text-neutral-100">
                          {customerName(estimate.customer)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {estimate.customer?.email ??
                            estimate.customer?.phone ??
                            "Kein Kontakt"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {statusLabel(estimate.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        {estimate.serviceCity ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        {formatDate(estimate.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-right font-black text-neutral-100">
                        {formatMoney(estimate.total, estimate.currency ?? "CHF")}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/dashboard/estimates/${estimate.id}`}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-white/[0.08]"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}