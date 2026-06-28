"use client";

import { useEffect, useState } from "react";

type DashboardCounts = {
  customers: number;
  sessions: number;
  conversationMessages: number;
  orders: number;
  quotes: number;
  invoices: number;
  payments: number;
  notifications: number;
  attachments: number;
  auditLogs: number;
};

type DashboardOverviewResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    counts: DashboardCounts;
  };
};

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard/overview", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard API returned an error");
        }

        const json: DashboardOverviewResponse = await response.json();

        setCounts(json.data.counts);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown dashboard error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const cards = counts
    ? [
        { label: "Klienci", value: counts.customers },
        { label: "Sesje", value: counts.sessions },
        { label: "Wiadomości", value: counts.conversationMessages },
        { label: "Zlecenia", value: counts.orders },
        { label: "Oferty", value: counts.quotes },
        { label: "Faktury", value: counts.invoices },
        { label: "Płatności", value: counts.payments },
        { label: "Powiadomienia", value: counts.notifications },
        { label: "Załączniki", value: counts.attachments },
        { label: "Audit Logi", value: counts.auditLogs },
      ]
    : [];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Dashboard właściciela
          </h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Panel CRM do kontroli klientów, zleceń, ofert, faktur, płatności i
            historii systemu.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie danych dashboardu...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            Błąd: {errorMessage}
          </div>
        )}

        {counts && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-lg"
              >
                <p className="text-sm text-neutral-400">{card.label}</p>
                <p className="mt-3 text-3xl font-bold text-white">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Status systemu</h2>

          <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-3">
            <div>Backend Foundation: OK</div>
            <div>CRM API: OK</div>
            <div>Dashboard Overview: OK</div>
            <div>Prisma / Neon: OK</div>
            <div>Test endpoints: aktywne</div>
            <div>Auth: do zrobienia</div>
          </div>
        </div>
      </section>
    </main>
  );
}