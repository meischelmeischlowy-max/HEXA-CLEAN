import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;

type SecurityEventRow = {
  id: string;
  scope: string;
  reason: string;
  severity: string;
  ipHash: string | null;
  fingerprintHash: string | null;
  userAgentHash: string | null;
  tokenPrefix: string | null;
  path: string | null;
  method: string | null;
  extra: unknown;
  createdAt: Date;
};

type AccessLogRow = {
  id: string;
  scope: string;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  success: boolean;
  ipHash: string | null;
  fingerprintHash: string | null;
  userAgentHash: string | null;
  tokenPrefix: string | null;
  rateLimitKey: string | null;
  rateLimitAllowed: boolean | null;
  rateLimitRemaining: number | null;
  retryAfterSeconds: number | null;
  requestBytes: number | null;
  responseMs: number | null;
  extra: unknown;
  createdAt: Date;
};

type FingerprintGroup = {
  fingerprintHash: string | null;
  _count: {
    fingerprintHash: number;
  };
};

type UnsafeSecurityPrisma = PrismaClient & {
  publicSecurityEvent: {
    count: (args?: Record<string, unknown>) => Promise<number>;
    findMany: (args?: Record<string, unknown>) => Promise<SecurityEventRow[]>;
    deleteMany: (args?: Record<string, unknown>) => Promise<{ count: number }>;
  };
  publicAccessLog: {
    count: (args?: Record<string, unknown>) => Promise<number>;
    findMany: (args?: Record<string, unknown>) => Promise<AccessLogRow[]>;
    groupBy: (args?: Record<string, unknown>) => Promise<FingerprintGroup[]>;
    deleteMany: (args?: Record<string, unknown>) => Promise<{ count: number }>;
  };
};

type SecurityFilters = {
  period: string;
  scope: string;
  severity: string;
  reason: string;
  success: string;
  statusCode: string;
};

const globalForPrisma = globalThis as unknown as {
  hexaSecurityDashboardPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaSecurityDashboardPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaSecurityDashboardPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaSecurityDashboardPrisma as UnsafeSecurityPrisma;
}

async function cleanupSecurityLogs(formData: FormData) {
  "use server";

  const rawDays = Number(formData.get("days") ?? 90);
  const allowedDays = [30, 60, 90, 180, 365];
  const days = allowedDays.includes(rawDays) ? rawDays : 90;
  const olderThan = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const prisma = getPrisma();

  await Promise.all([
    prisma.publicAccessLog.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    }),
    prisma.publicSecurityEvent.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/security");
}

function normalizeParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function normalizeFilters(searchParams: SearchParams): SecurityFilters {
  return {
    period: normalizeParam(searchParams.period, "7d"),
    scope: normalizeParam(searchParams.scope, "all"),
    severity: normalizeParam(searchParams.severity, "all"),
    reason: normalizeParam(searchParams.reason, "all"),
    success: normalizeParam(searchParams.success, "all"),
    statusCode: normalizeParam(searchParams.statusCode, "all"),
  };
}

function getDateFrom(period: string) {
  const now = Date.now();

  if (period === "24h") {
    return new Date(now - 24 * 60 * 60 * 1000);
  }

  if (period === "7d") {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }

  if (period === "30d") {
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }

  if (period === "90d") {
    return new Date(now - 90 * 24 * 60 * 60 * 1000);
  }

  return null;
}

function buildWhere(filters: SecurityFilters) {
  const dateFrom = getDateFrom(filters.period);

  const securityWhere: Record<string, unknown> = {};
  const accessWhere: Record<string, unknown> = {};

  if (dateFrom) {
    securityWhere.createdAt = {
      gte: dateFrom,
    };
    accessWhere.createdAt = {
      gte: dateFrom,
    };
  }

  if (filters.scope !== "all") {
    securityWhere.scope = filters.scope;
    accessWhere.scope = filters.scope;
  }

  if (filters.severity !== "all") {
    securityWhere.severity = filters.severity;
  }

  if (filters.reason !== "all") {
    securityWhere.reason = filters.reason;
  }

  if (filters.success === "true") {
    accessWhere.success = true;
  }

  if (filters.success === "false") {
    accessWhere.success = false;
  }

  if (filters.statusCode !== "all") {
    const parsedStatusCode = Number(filters.statusCode);

    if (Number.isInteger(parsedStatusCode)) {
      accessWhere.statusCode = parsedStatusCode;
    }
  }

  return {
    securityWhere,
    accessWhere,
  };
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(value);
}

function statusLabel(success: boolean, statusCode: number | null) {
  if (success) {
    return "OK";
  }

  if (statusCode) {
    return `FEHLER ${statusCode}`;
  }

  return "FEHLER";
}

function sourceLabel(scope: string) {
  if (scope === "quick_offer_contact") {
    return "QuickOffer";
  }

  if (scope === "ai_chat_lead") {
    return "AI-Chatbox";
  }

  return scope;
}

function FilterSelect(props: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {props.label}
      </span>
      <select
        name={props.name}
        defaultValue={props.defaultValue}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

async function getSecurityDashboardData(filters: SecurityFilters) {
  const prisma = getPrisma();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { securityWhere, accessWhere } = buildWhere(filters);

  const fingerprintWhere = {
    ...accessWhere,
    fingerprintHash: {
      not: null,
    },
  };

  const [
    totalSecurityEventsCount,
    totalAccessLogsCount,
    filteredSecurityEventsCount,
    filteredAccessLogsCount,
    criticalCount,
    warningCount,
    infoCount,
    rateLimitCount,
    serverErrorCount,
    quickOfferAccessCount,
    aiChatAccessCount,
    failedAccessCount,
    last24hSecurityCount,
    last24hAccessCount,
    latestSecurityEvents,
    latestAccessLogs,
    suspiciousFingerprints,
  ] = await Promise.all([
    prisma.publicSecurityEvent.count(),
    prisma.publicAccessLog.count(),
    prisma.publicSecurityEvent.count({
      where: securityWhere,
    }),
    prisma.publicAccessLog.count({
      where: accessWhere,
    }),
    prisma.publicSecurityEvent.count({
      where: {
        ...securityWhere,
        severity: "critical",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        ...securityWhere,
        severity: "warning",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        ...securityWhere,
        severity: "info",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        ...securityWhere,
        reason: "rate_limit_exceeded",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        ...securityWhere,
        reason: "server_error",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        ...accessWhere,
        scope: "quick_offer_contact",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        ...accessWhere,
        scope: "ai_chat_lead",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        ...accessWhere,
        success: false,
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        createdAt: {
          gte: last24h,
        },
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        createdAt: {
          gte: last24h,
        },
      },
    }),
    prisma.publicSecurityEvent.findMany({
      where: securityWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.publicAccessLog.findMany({
      where: accessWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.publicAccessLog.groupBy({
      by: ["fingerprintHash"],
      where: fingerprintWhere,
      _count: {
        fingerprintHash: true,
      },
      orderBy: {
        _count: {
          fingerprintHash: "desc",
        },
      },
      take: 15,
    }),
  ]);

  return {
    totalSecurityEventsCount,
    totalAccessLogsCount,
    filteredSecurityEventsCount,
    filteredAccessLogsCount,
    criticalCount,
    warningCount,
    infoCount,
    rateLimitCount,
    serverErrorCount,
    quickOfferAccessCount,
    aiChatAccessCount,
    failedAccessCount,
    last24hSecurityCount,
    last24hAccessCount,
    latestSecurityEvents,
    latestAccessLogs,
    suspiciousFingerprints,
  };
}

export default async function SecurityDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams =
    searchParams
      ? await searchParams
      : {};

  const filters =
    normalizeFilters(
      resolvedSearchParams,
    );

  const data =
    await getSecurityDashboardData(
      filters,
    );

  const urgentEvents =
    data.latestSecurityEvents.filter(
      (event) =>
        event.severity ===
          "critical" ||
        event.severity ===
          "warning",
    );

  const failedRequests =
    data.latestAccessLogs.filter(
      (log) => !log.success,
    );

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                HEXA OS / Sicherheit
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight">
                  Security Center
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Kritische Ereignisse und fehlgeschlagene öffentliche Requests.
                </p>
              </div>
            </div>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              Schutz aktiv
            </span>
          </div>

          <div
            data-testid="security-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-red-100">
              {data.criticalCount} kritisch
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {data.warningCount} Warnungen
            </span>

            <span className="rounded-lg border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
              {data.rateLimitCount} Rate-Limits
            </span>

            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {data.failedAccessCount} fehlgeschlagen
            </span>
          </div>
        </header>

        <details className="rounded-2xl border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-300">
            Filter und Datenaufbewahrung
          </summary>

          <div className="border-t border-white/10 p-4">
            <form
              action="/dashboard/security"
              method="get"
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
            >
              <FilterSelect
                label="Zeitraum"
                name="period"
                defaultValue={filters.period}
                options={[
                  { value: "24h", label: "24 Stunden" },
                  { value: "7d", label: "7 Tage" },
                  { value: "30d", label: "30 Tage" },
                  { value: "90d", label: "90 Tage" },
                  { value: "all", label: "Gesamt" },
                ]}
              />

              <FilterSelect
                label="Quelle"
                name="scope"
                defaultValue={filters.scope}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "quick_offer_contact", label: "QuickOffer" },
                  { value: "ai_chat_lead", label: "AI-Chatbox" },
                ]}
              />

              <FilterSelect
                label="Schweregrad"
                name="severity"
                defaultValue={filters.severity}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "critical", label: "Kritisch" },
                  { value: "warning", label: "Warnung" },
                  { value: "info", label: "Information" },
                ]}
              />

              <FilterSelect
                label="Grund"
                name="reason"
                defaultValue={filters.reason}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "rate_limit_exceeded", label: "Rate-Limit" },
                  { value: "invalid_request_body", label: "Ungültige Anfrage" },
                  { value: "validation_failed", label: "Validierung" },
                  { value: "server_error", label: "Serverfehler" },
                ]}
              />

              <FilterSelect
                label="Erfolg"
                name="success"
                defaultValue={filters.success}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "true", label: "Erfolgreich" },
                  { value: "false", label: "Fehlgeschlagen" },
                ]}
              />

              <FilterSelect
                label="HTTP"
                name="statusCode"
                defaultValue={filters.statusCode}
                options={[
                  { value: "all", label: "Alle" },
                  { value: "201", label: "201" },
                  { value: "400", label: "400" },
                  { value: "429", label: "429" },
                  { value: "500", label: "500" },
                ]}
              />

              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
                <button
                  type="submit"
                  className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100"
                >
                  Filter anwenden
                </button>

                <Link
                  href="/dashboard/security"
                  className="rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-zinc-300"
                >
                  Zurücksetzen
                </Link>
              </div>
            </form>

            <form
              action={cleanupSecurityLogs}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4"
            >
              <label className="grid gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                  Logs älter als
                </span>

                <select
                  name="days"
                  defaultValue="90"
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs"
                >
                  <option value="30">30 Tage</option>
                  <option value="60">60 Tage</option>
                  <option value="90">90 Tage</option>
                  <option value="180">180 Tage</option>
                  <option value="365">365 Tage</option>
                </select>
              </label>

              <button
                type="submit"
                className="rounded-lg border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-black text-red-100"
              >
                Alte Logs löschen
              </button>
            </form>
          </div>
        </details>

        <section
          data-testid="security-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
                Sicherheitsereignisse
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Kritische Ereignisse und Warnungen des aktuellen Filters.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {urgentEvents.length} Positionen
            </span>
          </div>

          {urgentEvents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-emerald-100">
                Keine kritischen Ereignisse
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Für den aktuellen Filter liegen keine Warnungen vor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {urgentEvents.map(
                (event) => (
                  <article
                    key={event.id}
                    className="grid gap-2 px-3 py-2.5 xl:grid-cols-[120px_160px_180px_minmax(300px,1fr)_180px] xl:items-center"
                  >
                    <span
                      className={`inline-flex w-fit rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${event.severity === "critical"
                        ? "border-red-300/25 bg-red-300/10 text-red-100"
                        : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                      }`}
                    >
                      {event.severity === "critical"
                        ? "Kritisch"
                        : "Warnung"}
                    </span>

                    <p className="truncate text-xs font-black text-white">
                      {sourceLabel(event.scope)}
                    </p>

                    <p className="truncate text-xs text-zinc-300">
                      {event.reason}
                    </p>

                    <p className="truncate text-xs text-zinc-400">
                      {event.method || "–"} {event.path || "Kein Pfad"}
                    </p>

                    <p className="text-xs font-bold text-zinc-300">
                      {formatDate(event.createdAt)}
                    </p>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                Fehlgeschlagene Requests
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">
                Letzte erfolglosen Zugriffe auf öffentliche Endpunkte.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {failedRequests.length} Positionen
            </span>
          </div>

          {failedRequests.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              Keine fehlgeschlagenen Requests im aktuellen Filter.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {failedRequests.map(
                (log) => (
                  <article
                    key={log.id}
                    className="grid gap-2 px-3 py-2.5 xl:grid-cols-[120px_160px_minmax(300px,1fr)_150px_180px] xl:items-center"
                  >
                    <span className="inline-flex w-fit rounded-lg border border-red-300/25 bg-red-300/10 px-2 py-1 text-[10px] font-black uppercase text-red-100">
                      {statusLabel(
                        log.success,
                        log.statusCode,
                      )}
                    </span>

                    <p className="truncate text-xs font-black text-white">
                      {sourceLabel(log.scope)}
                    </p>

                    <p className="truncate text-xs text-zinc-400">
                      {log.method || "–"} {log.path || "Kein Pfad"}
                    </p>

                    <p className="text-xs font-bold text-zinc-300">
                      {log.responseMs !== null
                        ? `${log.responseMs} ms`
                        : "Keine Zeit"}
                    </p>

                    <p className="text-xs font-bold text-zinc-300">
                      {formatDate(log.createdAt)}
                    </p>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}