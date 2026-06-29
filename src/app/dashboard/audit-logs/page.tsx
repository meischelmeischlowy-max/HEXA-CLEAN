"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function DashboardAuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuditLogs() {
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
    }

    loadAuditLogs();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Audit Logi
          </h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Historia zdarzeń systemowych HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie audit logów...
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
              <h2 className="text-xl font-semibold">Historia systemu</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {auditLogs.length}
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-6 text-neutral-500">
                Brak wpisów audit log w bazie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Akcja</th>
                      <th className="p-4 font-medium">Encja</th>
                      <th className="p-4 font-medium">Entity ID</th>
                      <th className="p-4 font-medium">Actor</th>
                      <th className="p-4 font-medium">IP</th>
                      <th className="p-4 font-medium">Wiadomość</th>
                      <th className="p-4 font-medium">Data</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 font-medium text-white">
                          {log.action ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {log.entityType ?? "—"}
                        </td>

                        <td className="max-w-[220px] truncate p-4 text-neutral-300">
                          {log.entityId ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {[log.actorType, log.actorId]
                            .filter(Boolean)
                            .join(": ") || "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {log.ipAddress ?? "—"}
                        </td>

                        <td className="max-w-[360px] truncate p-4 text-neutral-300">
                          {log.message ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(log.createdAt)}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/dashboard/audit-logs/${log.id}`}
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