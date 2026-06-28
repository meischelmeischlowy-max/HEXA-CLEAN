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

type ActivityRecord = {
  id?: string;
  createdAt?: string;
  status?: string;
  orderNumber?: string;
  quoteNumber?: string;
  invoiceNumber?: string;
  fileName?: string;
  action?: string;
  entityType?: string;
  amount?: string | number;
  total?: string | number;
  recipient?: string;
  channel?: string;
};

type RecentActivity = {
  recentOrders: ActivityRecord[];
  recentQuotes: ActivityRecord[];
  recentInvoices: ActivityRecord[];
  recentPayments: ActivityRecord[];
  recentNotifications: ActivityRecord[];
  recentAttachments: ActivityRecord[];
  recentAuditLogs: ActivityRecord[];
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

type DashboardRecentActivityResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    activity: RecentActivity;
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

function getRecordTitle(record: ActivityRecord, fallback: string) {
  return (
    record.orderNumber ??
    record.quoteNumber ??
    record.invoiceNumber ??
    record.fileName ??
    record.action ??
    record.entityType ??
    record.recipient ??
    record.id ??
    fallback
  );
}

function ActivityList({
  title,
  items,
  fallback,
}: {
  title: string;
  items: ActivityRecord[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Brak danych.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id ?? `${title}-${index}`}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="truncate text-sm font-medium text-white">
                {getRecordTitle(item, fallback)}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-400">
                {item.status && (
                  <span className="rounded-full bg-neutral-800 px-2 py-1">
                    {item.status}
                  </span>
                )}

                {item.channel && (
                  <span className="rounded-full bg-neutral-800 px-2 py-1">
                    {item.channel}
                  </span>
                )}

                {item.amount && (
                  <span className="rounded-full bg-neutral-800 px-2 py-1">
                    Kwota: {String(item.amount)}
                  </span>
                )}

                {item.total && (
                  <span className="rounded-full bg-neutral-800 px-2 py-1">
                    Total: {String(item.total)}
                  </span>
                )}

                <span className="rounded-full bg-neutral-800 px-2 py-1">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [overviewResponse, activityResponse] = await Promise.all([
          fetch("/api/dashboard/overview", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/dashboard/recent-activity", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (!overviewResponse.ok) {
          throw new Error("Dashboard Overview API returned an error");
        }

        if (!activityResponse.ok) {
          throw new Error("Dashboard Recent Activity API returned an error");
        }

        const overviewJson: DashboardOverviewResponse =
          await overviewResponse.json();

        const activityJson: DashboardRecentActivityResponse =
          await activityResponse.json();

        setCounts(overviewJson.data.counts);
        setActivity(activityJson.data.activity);
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
            Panel CRM do kontroli klientów, zleceń, ofert, faktur, płatności,
            powiadomień, załączników i historii systemu.
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

        {activity && (
          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Ostatnia aktywność</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Najnowsze dane z CRM, faktur, płatności i historii systemu.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ActivityList
                title="Ostatnie zlecenia"
                items={activity.recentOrders}
                fallback="Zlecenie"
              />

              <ActivityList
                title="Ostatnie oferty"
                items={activity.recentQuotes}
                fallback="Oferta"
              />

              <ActivityList
                title="Ostatnie faktury"
                items={activity.recentInvoices}
                fallback="Faktura"
              />

              <ActivityList
                title="Ostatnie płatności"
                items={activity.recentPayments}
                fallback="Płatność"
              />

              <ActivityList
                title="Ostatnie powiadomienia"
                items={activity.recentNotifications}
                fallback="Powiadomienie"
              />

              <ActivityList
                title="Ostatnie załączniki"
                items={activity.recentAttachments}
                fallback="Załącznik"
              />

              <div className="lg:col-span-2">
                <ActivityList
                  title="Audit Logi"
                  items={activity.recentAuditLogs}
                  fallback="Audit Log"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">Status systemu</h2>

          <div className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-3">
            <div>Backend Foundation: OK</div>
            <div>CRM API: OK</div>
            <div>Dashboard Overview: OK</div>
            <div>Recent Activity: OK</div>
            <div>Prisma / Neon: OK</div>
            <div>Auth: do zrobienia</div>
          </div>
        </div>
      </section>
    </main>
  );
}