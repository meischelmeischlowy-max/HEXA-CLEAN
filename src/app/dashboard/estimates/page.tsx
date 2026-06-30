"use client";

import { useEffect, useState } from "react";

type EstimateItem = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  riskMultiplier: string;
  riskAmount: string;
  total: string;
  unit: string;
};

type Estimate = {
  id: string;
  estimateNumber: string;
  status: string;
  title?: string | null;
  serviceCity?: string | null;
  subtotal: string;
  riskAmount: string;
  travelFee: string;
  materialFee: string;
  discountAmount: string;
  total: string;
  currency: string;
  aiMinTotal?: string | null;
  aiMaxTotal?: string | null;
  aiNotes?: string | null;
  createdAt: string;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  items: EstimateItem[];
};

type EstimatesResponse = {
  data: {
    status: string;
    message: string;
    estimates: Estimate[];
  };
};

function formatMoney(value: string | number | null | undefined, currency = "CHF") {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(number);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function customerName(estimate: Estimate) {
  const customer = estimate.customer;

  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
}

export default function DashboardEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEstimates() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "GET",
      });

      const json = (await response.json()) as EstimatesResponse;

      if (!response.ok) {
        setMessage(json.data?.message ?? "Nie udało się pobrać wycen.");
        return;
      }

      setEstimates(json.data.estimates ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nieznany błąd pobierania wycen."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createDemoEstimate() {
    setCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "POST",
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage(json.data?.message ?? "Nie udało się utworzyć wyceny demo.");
        return;
      }

      setMessage("Utworzono demo-wycenę.");
      await loadEstimates();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nieznany błąd tworzenia wyceny."
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    void loadEstimates();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Wyceny
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                Robocze kalkulacje z katalogu usług. To jeszcze nie jest
                oficjalna oferta dla klienta — właściciel musi zatwierdzić cenę.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadEstimates}
                disabled={loading}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Odśwież
              </button>

              <button
                type="button"
                onClick={createDemoEstimate}
                disabled={creating}
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Tworzę..." : "Dodaj demo-wycenę"}
              </button>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
              {message}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Wyceny razem</p>
            <p className="mt-2 text-3xl font-semibold">{estimates.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Suma brutto demo</p>
            <p className="mt-2 text-3xl font-semibold">
              {formatMoney(
                estimates.reduce((sum, estimate) => sum + Number(estimate.total), 0)
              )}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Do zatwierdzenia</p>
            <p className="mt-2 text-3xl font-semibold">
              {
                estimates.filter((estimate) =>
                  ["DRAFT", "AI_REVIEW", "NEEDS_HUMAN_REVIEW"].includes(
                    estimate.status
                  )
                ).length
              }
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Status systemu</p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">
              Kalkulator aktywny
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Lista wycen</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Dane pobierane z /api/dashboard/estimates.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-neutral-300">
              Ładowanie wycen...
            </div>
          ) : estimates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center">
              <p className="text-lg font-semibold">Brak wycen</p>
              <p className="mt-2 text-sm text-neutral-400">
                Kliknij „Dodaj demo-wycenę”, żeby sprawdzić kalkulator.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Numer</th>
                    <th className="px-4 py-4">Klient</th>
                    <th className="px-4 py-4">Tytuł</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Miasto</th>
                    <th className="px-4 py-4 text-right">Suma</th>
                    <th className="px-4 py-4">Data</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {estimates.map((estimate) => (
                    <tr key={estimate.id} className="bg-black/10">
                      <td className="px-4 py-4 font-medium text-cyan-200">
                        {estimate.estimateNumber}
                      </td>
                      <td className="px-4 py-4 text-neutral-200">
                        {customerName(estimate)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {estimate.title ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {estimate.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {estimate.serviceCity ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(estimate.total, estimate.currency)}
                      </td>
                      <td className="px-4 py-4 text-neutral-400">
                        {formatDate(estimate.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {estimates.map((estimate) => (
          <section
            key={`${estimate.id}-items`}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Szczegóły: {estimate.estimateNumber}
                </h2>
                <p className="text-sm text-neutral-400">
                  {estimate.aiNotes ?? "Brak notatek AI."}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-neutral-400">Widełki AI/demo</p>
                <p className="text-lg font-semibold text-cyan-200">
                  {formatMoney(estimate.aiMinTotal, estimate.currency)} –{" "}
                  {formatMoney(estimate.aiMaxTotal, estimate.currency)}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Usługa</th>
                    <th className="px-4 py-4">Ilość</th>
                    <th className="px-4 py-4">Cena</th>
                    <th className="px-4 py-4">Ryzyko</th>
                    <th className="px-4 py-4 text-right">Razem</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {estimate.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-neutral-100">{item.name}</p>
                        <p className="text-xs text-neutral-500">{item.unit}</p>
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {Number(item.quantity).toLocaleString("de-CH")}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {formatMoney(item.unitPrice, estimate.currency)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        x{Number(item.riskMultiplier).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(item.total, estimate.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-neutral-500">Subtotal</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(estimate.subtotal, estimate.currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-neutral-500">Ryzyko</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(estimate.riskAmount, estimate.currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-neutral-500">Dojazd</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(estimate.travelFee, estimate.currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-4">
                <p className="text-xs text-neutral-500">Rabat</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(estimate.discountAmount, estimate.currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-300 p-4 text-neutral-950">
                <p className="text-xs opacity-70">Total</p>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(estimate.total, estimate.currency)}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}