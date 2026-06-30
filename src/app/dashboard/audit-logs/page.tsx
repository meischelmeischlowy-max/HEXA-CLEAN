"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityTimeline from "../../../components/dashboard/ActivityTimeline";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DashboardTable, {
  type DashboardTableColumn,
} from "../../../components/dashboard/DashboardTable";
import EmptyState from "../../../components/dashboard/EmptyState";
import MetricCard from "../../../components/dashboard/MetricCard";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../components/dashboard/StatusBadge";

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

function normalizeAction(action?: string | null) {
  return action?.toUpperCase() ?? "UNKNOWN";
}

function formatAction(action?: string | null) {
  if (!action) return "Nieznana akcja";

  const labels: Record<string, string> = {
    CREATE: "Utworzono",
    CREATED: "Utworzono",
    UPDATE: "Zaktualizowano",
    UPDATED: "Zaktualizowano",
    DELETE: "Usunięto",
    DELETED: "Usunięto",
    STATUS_CHANGE: "Zmiana statusu",
    MARK_PAID: "Oznaczono jako opłacone",
    MARK_SENT: "Oznaczono jako wysłane",
    MARK_ACCEPTED: "Oznaczono jako zaakceptowane",
    MARK_COMPLETED: "Oznaczono jako zakończone",
    CREATE_QUOTE: "Utworzono ofertę",
    CREATE_INVOICE: "Utworzono fakturę",
    CREATE_PAYMENT: "Utworzono płatność",
    LOGIN: "Logowanie",
    LOGOUT: "Wylogowanie",
  };

  return labels[normalizeAction(action)] ?? action;
}

function getActionStatus(action?: string | null) {
  const normalizedAction = normalizeAction(action);

  if (
    [
      "CREATE",
      "CREATED",
      "CREATE_QUOTE",
      "CREATE_INVOICE",
      "CREATE_PAYMENT",
    ].includes(normalizedAction)
  ) {
    return "ACCEPTED";
  }

  if (
    [
      "STATUS_CHANGE",
      "MARK_PAID",
      "MARK_SENT",
      "MARK_ACCEPTED",
      "MARK_COMPLETED",
      "UPDATE",
      "UPDATED",
    ].includes(normalizedAction)
  ) {
    return "IN_PROGRESS";
  }

  if (["DELETE", "DELETED", "ERROR", "FAILED"].includes(normalizedAction)) {
    return "OVERDUE";
  }

  return "SENT";
}

function getActor(log: AuditLog) {
  return [log.actorType, log.actorId].filter(Boolean).join(": ") || "System";
}

function getEntity(log: AuditLog) {
  return log.entityType ?? "—";
}

function getEntityLabel(log: AuditLog) {
  return [log.entityType, log.entityId].filter(Boolean).join(" · ") || "—";
}

export default function DashboardAuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/audit-logs", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard AuditLogs API returned an error");
      }

      const json: DashboardAuditLogsResponse = await response.json();

      setAuditLogs(json.data.auditLogs ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown audit logs error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const stats = useMemo(() => {
    const statusChanges = auditLogs.filter(
      (log) => normalizeAction(log.action) === "STATUS_CHANGE"
    ).length;

    const created = auditLogs.filter((log) =>
      [
        "CREATE",
        "CREATED",
        "CREATE_QUOTE",
        "CREATE_INVOICE",
        "CREATE_PAYMENT",
      ].includes(normalizeAction(log.action))
    ).length;

    const financeEvents = auditLogs.filter((log) =>
      ["INVOICE", "PAYMENT", "QUOTE"].includes(
        log.entityType?.toUpperCase() ?? ""
      )
    ).length;

    const uniqueEntities = new Set(
      auditLogs
        .map((log) => getEntityLabel(log))
        .filter((entity) => entity !== "—")
    ).size;

    return {
      total: auditLogs.length,
      statusChanges,
      created,
      financeEvents,
      uniqueEntities,
    };
  }, [auditLogs]);

  const latestEvents = useMemo(() => {
    return auditLogs.slice(0, 5).map((log) => ({
      id: log.id,
      title: formatAction(log.action),
      description:
        log.message ??
        `${getEntity(log)} · ${log.entityId ?? "brak ID"} · ${getActor(log)}`,
      status: getActionStatus(log.action),
      time: formatDate(log.createdAt),
    }));
  }, [auditLogs]);

  const columns: DashboardTableColumn<AuditLog>[] = [
    {
      key: "action",
      header: "Akcja",
      render: (log) => (
        <div>
          <p className="font-black tracking-tight text-white">
            {formatAction(log.action)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Raw: {log.action ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Typ",
      render: (log) => (
        <StatusBadge
          status={getActionStatus(log.action)}
          label={formatAction(log.action)}
        />
      ),
    },
    {
      key: "entity",
      header: "Encja",
      render: (log) => (
        <div>
          <p className="font-semibold text-zinc-200">{getEntity(log)}</p>
          <p className="mt-1 max-w-xs truncate text-xs text-zinc-500">
            {log.entityId ?? "Brak entity ID"}
          </p>
        </div>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (log) => (
        <div>
          <p className="font-semibold text-zinc-200">{getActor(log)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            IP: {log.ipAddress ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "message",
      header: "Wiadomość",
      render: (log) => (
        <p className="max-w-md text-sm leading-6 text-zinc-400">
          {log.message ?? "—"}
        </p>
      ),
    },
    {
      key: "created",
      header: "Data",
      render: (log) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(log.createdAt)}
        </p>
      ),
    },
    {
      key: "actionLink",
      header: "Akcja",
      className: "text-right",
      render: (log) => (
        <div className="flex justify-end">
          <PremiumButton
            href={`/dashboard/audit-logs/${log.id}`}
            variant="primary"
            size="sm"
          >
            Szczegóły
          </PremiumButton>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS CRM / Audit Logs"
          title="Historia działań systemu"
          description="Audit log zapisuje kluczowe zdarzenia workflow: tworzenie ofert, faktur, płatności, zmiany statusów i działania administratora."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadAuditLogs}
            disabled={loading}
          >
            Odśwież
          </PremiumButton>
          <PremiumButton href="/dashboard" variant="ghost">
            Overview
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Wszystkie zdarzenia"
            value={String(stats.total)}
            description="Łączna liczba wpisów w historii systemu."
            trend="Źródło: AuditLogs API"
            tone="cyan"
            icon={<span className="text-lg font-black">LOG</span>}
          />

          <MetricCard
            title="Zmiany statusów"
            value={String(stats.statusChanges)}
            description="Zdarzenia typu STATUS_CHANGE."
            trend="Workflow tracking"
            tone="violet"
            icon={<span className="text-lg font-black">↻</span>}
          />

          <MetricCard
            title="Utworzone rekordy"
            value={String(stats.created)}
            description="Oferty, faktury, płatności i inne rekordy."
            trend="CRM automation"
            tone="emerald"
            icon={<span className="text-lg font-black">+</span>}
          />

          <MetricCard
            title="Finanse"
            value={String(stats.financeEvents)}
            description={`Unikalne encje: ${stats.uniqueEntities}.`}
            trend="Quote / Invoice / Payment"
            tone="amber"
            icon={<span className="text-lg font-black">CHF</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Ładowanie audit logów"
            description="HEXA OS pobiera aktualną historię działań systemowych."
          >
            <div className="grid gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </DashboardPanel>
        ) : null}

        {errorMessage ? (
          <DashboardPanel
            title="Błąd modułu Audit Logs"
            description="Nie udało się pobrać historii działań z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/audit-logs oraz połączenie z
                bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <DashboardPanel
              title="Tabela zdarzeń"
              description={`Liczba rekordów: ${auditLogs.length}. Każdy wpis pomaga odtworzyć, kto i kiedy wykonał daną akcję.`}
              action={
                <StatusBadge
                  status={auditLogs.length > 0 ? "ACCEPTED" : "PENDING"}
                  label={
                    auditLogs.length > 0 ? "Historia aktywna" : "Brak wpisów"
                  }
                />
              }
            >
              <DashboardTable
                columns={columns}
                rows={auditLogs}
                getRowKey={(log) => log.id}
                empty={
                  <EmptyState
                    title="Brak wpisów audit log"
                    description="Pierwsze wpisy pojawią się tutaj po utworzeniu ofert, faktur, płatności albo zmianach statusów w systemie."
                    actionLabel="Wróć do overview"
                    actionHref="/dashboard"
                  />
                }
              />
            </DashboardPanel>

            <DashboardPanel
              title="Live feed"
              description="Najnowsze zdarzenia systemowe w formie osi czasu."
            >
              <ActivityTimeline
                items={latestEvents}
                emptyTitle="Brak ostatnich zdarzeń"
                emptyDescription="Po wykonaniu akcji w CRM zobaczysz tutaj live feed."
              />
            </DashboardPanel>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola Audit Log"
            description="Historia działań jest fundamentem bezpieczeństwa, automatyzacji i późniejszej obsługi wielu firm w MM Digital Core."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Pełny ślad workflow
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Każda ważna akcja, status i przejście między modułami powinny
                  być zapisane.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Debug i kontrola
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Logi pomagają sprawdzić, co zrobił system, użytkownik albo
                  automatyzacja.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  Gotowe pod SaaS
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Dla wielu firm później każdy tenant będzie miał własną
                  historię działań.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}