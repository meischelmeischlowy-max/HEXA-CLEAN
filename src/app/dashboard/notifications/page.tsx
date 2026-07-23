"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

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

function normalizeStatus(
  status?: string | null,
) {
  return String(
    status || "UNKNOWN",
  ).toUpperCase();
}

function statusLabel(
  status?: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "FAILED":
      return "Fehler";

    case "PENDING":
      return "Wartend";

    case "SENT":
      return "Gesendet";

    case "READ":
      return "Gelesen";

    default:
      return "Unbekannt";
  }
}

function statusPriority(
  status?: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "FAILED":
      return 0;

    case "PENDING":
      return 1;

    case "SENT":
      return 2;

    case "READ":
      return 3;

    default:
      return 4;
  }
}

function statusClasses(
  status?: string | null,
) {
  switch (
    normalizeStatus(status)
  ) {
    case "FAILED":
      return "border-red-300/25 bg-red-300/10 text-red-100";

    case "PENDING":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";

    case "SENT":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

    case "READ":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";

    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Kein Datum";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Kein Datum";
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Zurich",
    },
  ).format(date);
}

function notificationTimestamp(
  notification: Notification,
) {
  const value =
    notification.createdAt ??
    notification.updatedAt ??
    notification.sentAt;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function rowDescription(
  notification: Notification,
) {
  if (
    normalizeStatus(
      notification.status,
    ) === "FAILED"
  ) {
    return (
      notification.errorMessage ||
      notification.message ||
      "Der Versand ist fehlgeschlagen."
    );
  }

  return (
    notification.message ||
    "Keine zusätzliche Nachricht."
  );
}

export default function DashboardNotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const loadNotifications =
    useCallback(
      async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
          const response =
            await fetch(
              "/api/dashboard/notifications",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Die Benachrichtigungen konnten nicht geladen werden.",
            );
          }

          const json =
            (await response.json()) as DashboardNotificationsResponse;

          setNotifications(
            json.data
              ?.notifications ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Die Benachrichtigungen konnten nicht geladen werden.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadNotifications();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadNotifications]);

  const sortedNotifications =
    useMemo(() => {
      return [
        ...notifications,
      ].sort(
        (
          left,
          right,
        ) => {
          const priorityDifference =
            statusPriority(
              left.status,
            ) -
            statusPriority(
              right.status,
            );

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          return (
            notificationTimestamp(
              right,
            ) -
            notificationTimestamp(
              left,
            )
          );
        },
      );
    }, [notifications]);

  const stats =
    useMemo(() => {
      return notifications.reduce(
        (
          result,
          notification,
        ) => {
          const status =
            normalizeStatus(
              notification.status,
            );

          if (
            status === "FAILED"
          ) {
            result.failed += 1;
          }

          if (
            status === "PENDING"
          ) {
            result.pending += 1;
          }

          if (
            status === "SENT"
          ) {
            result.sent += 1;
          }

          return result;
        },
        {
          failed: 0,
          pending: 0,
          sent: 0,
        },
      );
    }, [notifications]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Benachrichtigungen
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Benachrichtigungen
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Fehlgeschlagene und wartende Vorgänge stehen zuerst.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={
                loadNotifications
              }
              disabled={loading}
            >
              Aktualisieren
            </PremiumButton>
          </div>

          <div
            data-testid="notifications-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {notifications.length} gesamt
            </span>

            <span className="rounded-lg border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-100">
              {stats.failed} Fehler
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.pending} wartend
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.sent} gesendet
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="notifications-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Versand und Systemmeldungen
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Pro Eintrag führt eine Aktion zu den vollständigen Details.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedNotifications.length} Positionen
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
          sortedNotifications.length ===
            0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Benachrichtigungen vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Neue Versand- und Systemmeldungen erscheinen automatisch.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedNotifications.length >
            0 ? (
            <div className="divide-y divide-white/10">
              {sortedNotifications.map(
                (
                  notification,
                ) => (
                  <article
                    key={
                      notification.id
                    }
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[120px_minmax(210px,0.9fr)_minmax(240px,1.1fr)_minmax(300px,1.4fr)_145px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClasses(
                          notification.status,
                        )}`}
                      >
                        {statusLabel(
                          notification.status,
                        )}
                      </span>

                      <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-600">
                        {notification.channel ??
                          "Kein Kanal"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {notification.recipient ??
                          "Kein Empfänger"}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {formatDate(
                          notification.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-white">
                        {notification.subject ??
                          "Ohne Betreff"}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {normalizeStatus(
                          notification.status,
                        ) === "SENT"
                          ? `Versendet: ${formatDate(
                              notification.sentAt,
                            )}`
                          : "Noch nicht erfolgreich versendet"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p
                        className={
                          normalizeStatus(
                            notification.status,
                          ) === "FAILED"
                            ? "truncate text-xs font-bold text-red-100"
                            : "truncate text-xs text-zinc-400"
                        }
                      >
                        {rowDescription(
                          notification,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Erstellt
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                        {formatDate(
                          notification.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/notifications/${notification.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Details öffnen
                      </PremiumButton>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}