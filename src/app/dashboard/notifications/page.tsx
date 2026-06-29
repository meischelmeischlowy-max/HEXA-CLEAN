"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notification = {
  id: string;
  channel?: string | null;
  status?: string | null;
  recipient?: string | null;
  subject?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardNotificationsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    notifications: Notification[];
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

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch("/api/dashboard/notifications", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Notifications API returned an error");
        }

        const json: DashboardNotificationsResponse = await response.json();

        setNotifications(json.data.notifications ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unknown notifications error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Powiadomienia
          </h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista powiadomień systemowych zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie powiadomień...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            Błąd: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 p-5">
              <h2 className="text-xl font-semibold">Lista powiadomień</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {notifications.length}
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-neutral-500">
                Brak powiadomień w bazie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Kanał</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Odbiorca</th>
                      <th className="p-4 font-medium">Temat</th>
                      <th className="p-4 font-medium">Wiadomość</th>
                      <th className="p-4 font-medium">Wysłano</th>
                      <th className="p-4 font-medium">Odczytano</th>
                      <th className="p-4 font-medium">Dodano</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notifications.map((notification) => (
                      <tr
                        key={notification.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 text-neutral-300">
                          {notification.channel ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {notification.status ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {notification.recipient ?? "—"}
                        </td>

                        <td className="p-4 text-white">
                          {notification.subject ?? "—"}
                        </td>

                        <td className="max-w-[320px] truncate p-4 text-neutral-300">
                          {notification.message ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(notification.sentAt)}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(notification.readAt)}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(notification.createdAt)}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/dashboard/notifications/${notification.id}`}
                            className="rounded-xl border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
                          >
                            Szczegóły
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}