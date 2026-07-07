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

function shortHash(value: string | null) {
  if (!value) {
    return "-";
  }

  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 10)}…${value.slice(-4)}`;
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

function badgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "critical" || normalized.includes("500")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (normalized === "warning" || normalized.includes("429")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalized === "info" || normalized === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

function safeExtraPreview(value: unknown) {
  if (!value) {
    return "-";
  }

  try {
    const json = JSON.stringify(value);

    if (!json || json === "{}") {
      return "-";
    }

    return json.length > 180 ? `${json.slice(0, 180)}…` : json;
  } catch {
    return "-";
  }
}

function buildPresetHref(params: Partial<SecurityFilters>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value || value === "all") {
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();

  return query ? `/dashboard/security?${query}` : "/dashboard/security";
}

function Card(props: {
  title: string;
  value: string | number;
  description: string;
  tone?: "default" | "success" | "warning" | "critical";
}) {
  const toneClass =
    props.tone === "critical"
      ? "border-red-200 bg-red-50"
      : props.tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : props.tone === "success"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium text-slate-600">{props.title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{props.value}</p>
      <p className="mt-2 text-sm text-slate-600">{props.description}</p>
    </div>
  );
}

function SectionTitle(props: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-950">{props.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{props.description}</p>
    </div>
  );
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
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = normalizeFilters(resolvedSearchParams);
  const data = await getSecurityDashboardData(filters);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            HEXA OS SECURITY
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                Security Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Vollständige Übersicht über öffentliche Requests,
                Sicherheitsereignisse, Rate-Limits sowie Formularfehler aus
                QuickOffer und AI-Chatbox. Technische Daten werden gehasht.
                Rohe Kundenkontakte werden nicht in Access Logs gespeichert.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>Status:</strong> Persistent Logs aktiv
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Security Center Filter"
            description="Ansicht nach Zeitraum, Quelle, Schweregrad, Fehlergrund oder Request-Status eingrenzen."
          />

          <form
            action="/dashboard/security"
            method="get"
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
          >
            <FilterSelect
              label="Zeitraum"
              name="period"
              defaultValue={filters.period}
              options={[
                { value: "24h", label: "Letzte 24 Stunden" },
                { value: "7d", label: "Letzte 7 Tage" },
                { value: "30d", label: "Letzte 30 Tage" },
                { value: "90d", label: "Letzte 90 Tage" },
                { value: "all", label: "Gesamter Verlauf" },
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
                { value: "critical", label: "Critical" },
                { value: "warning", label: "Warning" },
                { value: "info", label: "Info" },
              ]}
            />

            <FilterSelect
              label="Grund"
              name="reason"
              defaultValue={filters.reason}
              options={[
                { value: "all", label: "Alle" },
                { value: "rate_limit_exceeded", label: "Rate Limit" },
                { value: "invalid_request_body", label: "Invalid Body" },
                { value: "validation_failed", label: "Validation Failed" },
                { value: "server_error", label: "Server Error" },
              ]}
            />

            <FilterSelect
              label="Erfolg"
              name="success"
              defaultValue={filters.success}
              options={[
                { value: "all", label: "Alle" },
                { value: "true", label: "Nur OK" },
                { value: "false", label: "Nur fehlgeschlagen" },
              ]}
            />

            <FilterSelect
              label="HTTP"
              name="statusCode"
              defaultValue={filters.statusCode}
              options={[
                { value: "all", label: "Alle" },
                { value: "201", label: "201 Created" },
                { value: "400", label: "400 Bad Request" },
                { value: "429", label: "429 Rate Limit" },
                { value: "500", label: "500 Server Error" },
              ]}
            />

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-6">
              <button
                type="submit"
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Filtern
              </button>

              <Link
                href="/dashboard/security"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Zurücksetzen
              </Link>

              <Link
                href={buildPresetHref({
                  period: "24h",
                  severity: "critical",
                  success: "false",
                })}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                Critical 24h
              </Link>

              <Link
                href={buildPresetHref({
                  period: "7d",
                  reason: "rate_limit_exceeded",
                })}
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
              >
                Rate Limit 7d
              </Link>

              <Link
                href={buildPresetHref({
                  period: "7d",
                  success: "false",
                })}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Fehler 7d
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Security Events"
            value={data.filteredSecurityEventsCount}
            description={`Gefiltert / total: ${data.totalSecurityEventsCount}`}
          />
          <Card
            title="Access Logs"
            value={data.filteredAccessLogsCount}
            description={`Gefiltert / total: ${data.totalAccessLogsCount}`}
            tone="success"
          />
          <Card
            title="Security 24h"
            value={data.last24hSecurityCount}
            description="Sicherheitsereignisse der letzten 24 Stunden."
            tone={data.last24hSecurityCount > 0 ? "warning" : "success"}
          />
          <Card
            title="Access 24h"
            value={data.last24hAccessCount}
            description="Öffentliche Requests der letzten 24 Stunden."
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Critical"
            value={data.criticalCount}
            description="Server Errors oder kritische Ereignisse."
            tone={data.criticalCount > 0 ? "critical" : "success"}
          />
          <Card
            title="Warnings"
            value={data.warningCount}
            description="Warnereignisse aus öffentlichen Endpunkten."
            tone={data.warningCount > 0 ? "warning" : "success"}
          />
          <Card
            title="Rate Limit"
            value={data.rateLimitCount}
            description="Überschrittene Formular-Limits."
            tone={data.rateLimitCount > 0 ? "warning" : "success"}
          />
          <Card
            title="Server Errors"
            value={data.serverErrorCount}
            description="HTTP-500-Fehler aus öffentlichen Endpunkten."
            tone={data.serverErrorCount > 0 ? "critical" : "success"}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Info"
            value={data.infoCount}
            description="Validierungsfehler und ungültige Request-Bodies."
          />
          <Card
            title="Failed Access"
            value={data.failedAccessCount}
            description="Fehlgeschlagene öffentliche Requests."
            tone={data.failedAccessCount > 0 ? "warning" : "success"}
          />
          <Card
            title="QuickOffer"
            value={data.quickOfferAccessCount}
            description="Requests aus dem QuickOffer-Formular."
          />
          <Card
            title="AI-Chatbox"
            value={data.aiChatAccessCount}
            description="Requests aus dem AI-Chatbox-Formular."
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Log-Aufbewahrung"
            description="Manuelle Bereinigung alter technischer Sicherheits- und Access Logs."
          />

          <form action={cleanupSecurityLogs} className="mt-5 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Löschen älter als
              </span>
              <select
                name="days"
                defaultValue="90"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
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
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              Alte Logs löschen
            </button>

            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Diese Aktion löscht nur technische Security- und Access Logs.
              Kunden, Aufträge, Kalkulationen, Rechnungen, CRM-Nachrichten und
              CRM-Audit-Logs bleiben unverändert.
            </p>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Aktive Fingerprints"
            description="Häufigste Request-Fingerprints im aktuellen Filter. So lassen sich Spam, Bots oder ungewöhnliche Aktivität erkennen."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Bewertung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.suspiciousFingerprints.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={3}>
                      Keine Daten vorhanden.
                    </td>
                  </tr>
                ) : (
                  data.suspiciousFingerprints.map((item) => {
                    const count = item._count.fingerprintHash;

                    return (
                      <tr key={item.fingerprintHash ?? "unknown"}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {shortHash(item.fingerprintHash)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-950">
                          {count}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              count >= 20
                                ? "border-red-200 bg-red-50 text-red-700"
                                : count >= 8
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {count >= 20
                              ? "hohe Aktivität"
                              : count >= 8
                                ? "beobachten"
                                : "normal"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Letzte Security Events"
            description="Kritische und warnende Ereignisse aus öffentlichen Endpunkten im aktuellen Filter."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Quelle</th>
                  <th className="px-4 py-3">Schweregrad</th>
                  <th className="px-4 py-3">Grund</th>
                  <th className="px-4 py-3">Pfad</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.latestSecurityEvents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>
                      Keine Security Events für den aktuellen Filter.
                    </td>
                  </tr>
                ) : (
                  data.latestSecurityEvents.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(event.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {sourceLabel(event.scope)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                            event.severity,
                          )}`}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {event.reason}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {event.method ?? "-"} {event.path ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {shortHash(event.fingerprintHash)}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 font-mono text-xs text-slate-500">
                        {safeExtraPreview(event.extra)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Letzte Public Access Logs"
            description="Letzte Requests öffentlicher Formulare und Endpunkte im aktuellen Filter."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Quelle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pfad</th>
                  <th className="px-4 py-3">Rate Limit</th>
                  <th className="px-4 py-3">Antwortzeit</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.latestAccessLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={8}>
                      Keine Access Logs für den aktuellen Filter.
                    </td>
                  </tr>
                ) : (
                  data.latestAccessLogs.map((log) => {
                    const status = statusLabel(log.success, log.statusCode);

                    return (
                      <tr key={log.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-950">
                          {sourceLabel(log.scope)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                              status,
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {log.method ?? "-"} {log.path ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {log.rateLimitAllowed === null
                            ? "-"
                            : log.rateLimitAllowed
                              ? `erlaubt / übrig ${log.rateLimitRemaining ?? "-"}`
                              : `blockiert / erneut in ${log.retryAfterSeconds ?? "-"}s`}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {log.responseMs === null ? "-" : `${log.responseMs} ms`}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {shortHash(log.fingerprintHash)}
                        </td>
                        <td className="max-w-[260px] px-4 py-3 font-mono text-xs text-slate-500">
                          {safeExtraPreview(log.extra)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Aktuelle Bewertung"
            description="Einschätzung nach dem Ausbau des Security Centers zur praktischen Kontrollseite."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-semibold text-emerald-900">
                Was gut funktioniert
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Öffentliche Endpunkte haben Rate-Limits, sichere Antworten,
                No-Store-Cache, persistente DB-Logs, Filter, Fingerprint-Ansicht
                und manuelle Bereinigung alter technischer Logs.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">
                Worauf geachtet werden muss
              </h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Hohe Request-Zahlen pro Fingerprint, HTTP 429, HTTP 400,
                validation_failed sowie jeder server_error aus öffentlichen
                Eingängen.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-950">
                Was später ergänzt wird
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                E-Mail/SMS-Alerts bei kritischen Ereignissen, Detailseiten für
                Fingerprints und ein globaler produktiver Rate-Limit-Store über
                Redis oder Datenbank.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}