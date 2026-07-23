"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

type AuditLog = {
  id: string;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  message?: string | null;
  ipAddress?: string | null;
  createdAt?: string;
};

type DashboardAuditLogsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    auditLogs: AuditLog[];
  };
};

function normalizeAction(
  action?: string | null,
) {
  return String(
    action || "UNKNOWN",
  ).toUpperCase();
}

function actionLabel(
  action?: string | null,
) {
  const labels: Record<
    string,
    string
  > = {
    CREATE: "Erstellt",
    CREATED: "Erstellt",
    UPDATE: "Aktualisiert",
    UPDATED: "Aktualisiert",
    DELETE: "Gelöscht",
    DELETED: "Gelöscht",
    STATUS_CHANGE:
      "Status geändert",
    MARK_PAID:
      "Als bezahlt markiert",
    MARK_SENT:
      "Als gesendet markiert",
    MARK_ACCEPTED:
      "Als angenommen markiert",
    MARK_COMPLETED:
      "Als abgeschlossen markiert",
    CREATE_QUOTE:
      "Offerte erstellt",
    CREATE_INVOICE:
      "Rechnung erstellt",
    CREATE_PAYMENT:
      "Zahlung erstellt",
    LOGIN: "Anmeldung",
    LOGOUT: "Abmeldung",
  };

  const normalized =
    normalizeAction(action);

  return labels[normalized] ??
    action ??
    "Unbekannte Aktion";
}

function actionClasses(
  action?: string | null,
) {
  const normalized =
    normalizeAction(action);

  if (
    normalized.includes(
      "DELETE",
    ) ||
    normalized.includes(
      "FAILED",
    ) ||
    normalized.includes(
      "ERROR",
    )
  ) {
    return "border-red-300/25 bg-red-300/10 text-red-100";
  }

  if (
    normalized.includes(
      "UPDATE",
    ) ||
    normalized.includes(
      "STATUS",
    ) ||
    normalized.includes(
      "MARK",
    )
  ) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Kein Datum";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kein Datum";
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Zurich",
    },
  ).format(date);
}

function timestamp(
  log: AuditLog,
) {
  if (!log.createdAt) {
    return 0;
  }

  const value =
    new Date(
      log.createdAt,
    ).getTime();

  return Number.isNaN(value)
    ? 0
    : value;
}

export default function DashboardAuditLogsPage() {
  const [
    auditLogs,
    setAuditLogs,
  ] = useState<AuditLog[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const loadAuditLogs =
    useCallback(
      async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
          const response =
            await fetch(
              "/api/dashboard/audit-logs",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Der Systemverlauf konnte nicht geladen werden.",
            );
          }

          const json =
            (await response.json()) as DashboardAuditLogsResponse;

          setAuditLogs(
            json.data?.auditLogs ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Der Systemverlauf konnte nicht geladen werden.",
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
        void loadAuditLogs();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadAuditLogs]);

  const sortedLogs =
    useMemo(
      () =>
        [...auditLogs].sort(
          (left, right) =>
            timestamp(right) -
            timestamp(left),
        ),
      [auditLogs],
    );

  const stats =
    useMemo(() => {
      const created =
        auditLogs.filter(
          (log) =>
            normalizeAction(
              log.action,
            ).includes(
              "CREATE",
            ),
        ).length;

      const updated =
        auditLogs.filter(
          (log) => {
            const action =
              normalizeAction(
                log.action,
              );

            return (
              action.includes(
                "UPDATE",
              ) ||
              action.includes(
                "STATUS",
              ) ||
              action.includes(
                "MARK",
              )
            );
          },
        ).length;

      return {
        created,
        updated,
      };
    }, [auditLogs]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS / Systemverlauf
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight">
                  Audit-Logs
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Automatisch gespeicherter Verlauf wichtiger Systemaktionen.
                </p>
              </div>
            </div>

            <PremiumButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={
                loadAuditLogs
              }
              disabled={loading}
            >
              Aktualisieren
            </PremiumButton>
          </div>

          <div
            data-testid="audit-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {auditLogs.length} gesamt
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.created} erstellt
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.updated} geändert
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="audit-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Systemaktionen
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Neueste Einträge stehen zuerst.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedLogs.length} Positionen
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
          sortedLogs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black">
                Keine Audit-Logs vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Neue Systemaktionen werden automatisch protokolliert.
              </p>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedLogs.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedLogs.map(
                (log) => (
                  <article
                    key={log.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[170px_150px_minmax(180px,0.8fr)_minmax(320px,1.5fr)_170px_auto] xl:items-center"
                  >
                    <div>
                      <span
                        className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${actionClasses(
                          log.action,
                        )}`}
                      >
                        {actionLabel(
                          log.action,
                        )}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Bereich
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold">
                        {log.entityType ||
                          "System"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Auslöser
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold">
                        {log.actorType ||
                          "System"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs text-zinc-300">
                        {log.message ||
                          "Keine Beschreibung gespeichert."}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Zeitpunkt
                      </p>

                      <p className="mt-0.5 text-xs font-bold">
                        {formatDate(
                          log.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/audit-logs/${log.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Eintrag öffnen
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