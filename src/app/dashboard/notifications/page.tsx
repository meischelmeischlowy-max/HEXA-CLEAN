"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeStatus(status?: string | null) {
  return String(status || "UNKNOWN").toUpperCase();
}

function statusClass(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "SENT") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (normalized === "FAILED") {
    return "border-red-300/25 bg-red-300/10 text-red-100";
  }

  if (normalized === "PENDING") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (normalized === "READ") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "green" | "amber" | "red";
}) {
  const className =
    tone === "green"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : tone === "amber"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : tone === "red"
          ? "border-red-300/25 bg-red-300/10 text-red-100"
          : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-3xl border p-5 ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function ErrorBox({ errorMessage }: { errorMessage?: string | null }) {
  if (!errorMessage) {
    return (
      <span className="text-xs text-zinc-500">
        Kein Fehlertext gespeichert.
      </span>
    );
  }

  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-2xl border border-red-300/20 bg-red-950/30 p-3 text-xs leading-5 text-red-100">
      {errorMessage}
    </pre>
  );
}

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setErrorMessage(null);

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
          : "Unknown notifications error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const stats = useMemo(() => {
    const failed = notifications.filter(
      (notification) => normalizeStatus(notification.status) === "FAILED",
    ).length;

    const pending = notifications.filter(
      (notification) => normalizeStatus(notification.status) === "PENDING",
    ).length;

    const sent = notifications.filter(
      (notification) => normalizeStatus(notification.status) === "SENT",
    ).length;

    return {
      total: notifications.length,
      failed,
      pending,
      sent,
    };
  }, [notifications]);

  const failedNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => normalizeStatus(notification.status) === "FAILED",
      ),
    [notifications],
  );

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-none flex-col gap-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-400">
                HEXA OS CRM
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight">
                Benachrichtigungen
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                Versandlog für Systemnachrichten, Kundenmails und interne
                Owner-Benachrichtigungen. Fehler werden direkt sichtbar, damit
                Resend / SMTP / Konfiguration sofort geprüft werden kann.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadNotifications}
                disabled={loading}
                className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Aktualisieren
              </button>

              <Link
                href="/dashboard/security"
                className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-white/10"
              >
                Security Logs
              </Link>
            </div>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Gesamt" value={stats.total} tone="neutral" />
          <StatCard label="Gesendet" value={stats.sent} tone="green" />
          <StatCard label="Wartend" value={stats.pending} tone="amber" />
          <StatCard label="Fehler" value={stats.failed} tone="red" />
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            Benachrichtigungen werden geladen...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-3xl border border-red-300/25 bg-red-300/10 p-6 text-red-100">
            <p className="font-black">Fehler beim Laden</p>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        ) : null}

        {!loading && !errorMessage && failedNotifications.length > 0 ? (
          <section className="rounded-3xl border border-red-300/25 bg-red-300/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-100/80">
              Sofort prüfen
            </p>

            <h2 className="mt-2 text-2xl font-black text-red-50">
              Fehlgeschlagene E-Mail Benachrichtigungen
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-red-50/80">
              Diese Eintraege wurden im CRM gespeichert, aber der Versandkanal
              hat die E-Mail nicht erfolgreich gesendet. Der genaue Fehler steht
              direkt im Feld Fehler.
            </p>

            <div className="mt-5 grid gap-4">
              {failedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-3xl border border-red-300/20 bg-black/30 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr_2fr]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-red-100/60">
                        Empfaenger
                      </p>
                      <p className="mt-2 break-words text-sm font-black text-white">
                        {notification.recipient ?? "-"}
                      </p>

                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-red-100/60">
                        Erstellt
                      </p>
                      <p className="mt-2 text-sm font-bold text-red-50">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-red-100/60">
                        Betreff
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {notification.subject ?? "-"}
                      </p>

                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-red-100/60">
                        Kanal / Status
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white">
                          {notification.channel ?? "-"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                            notification.status,
                          )}`}
                        >
                          {normalizeStatus(notification.status)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-red-100/60">
                        Fehler
                      </p>
                      <div className="mt-2">
                        <ErrorBox errorMessage={notification.errorMessage} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-xl font-black">Benachrichtigungsliste</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Anzahl Datensaetze: {notifications.length}
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-neutral-500">
                Keine Benachrichtigungen in der Datenbank.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Kanal</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Empfaenger</th>
                      <th className="p-4 font-medium">Betreff</th>
                      <th className="p-4 font-medium">Nachricht</th>
                      <th className="p-4 font-medium">Fehler</th>
                      <th className="p-4 font-medium">Versendet</th>
                      <th className="p-4 font-medium">Gelesen</th>
                      <th className="p-4 font-medium">Hinzugefuegt</th>
                    </tr>
                  </thead>

                  <tbody>
                    {notifications.map((notification) => (
                      <tr
                        key={notification.id}
                        className="border-b border-white/10 last:border-b-0"
                      >
                        <td className="p-4 text-neutral-300">
                          {notification.channel ?? "-"}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                              notification.status,
                            )}`}
                          >
                            {normalizeStatus(notification.status)}
                          </span>
                        </td>

                        <td className="max-w-[220px] break-words p-4 text-neutral-200">
                          {notification.recipient ?? "-"}
                        </td>

                        <td className="max-w-[260px] p-4 font-semibold text-white">
                          {notification.subject ?? "-"}
                        </td>

                        <td className="max-w-[320px] truncate p-4 text-neutral-300">
                          {notification.message ?? "-"}
                        </td>

                        <td className="max-w-[420px] p-4">
                          {normalizeStatus(notification.status) === "FAILED" ? (
                            <ErrorBox errorMessage={notification.errorMessage} />
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}