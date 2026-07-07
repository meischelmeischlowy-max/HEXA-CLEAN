import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  };
  publicAccessLog: {
    count: (args?: Record<string, unknown>) => Promise<number>;
    findMany: (args?: Record<string, unknown>) => Promise<AccessLogRow[]>;
    groupBy: (args?: Record<string, unknown>) => Promise<FingerprintGroup[]>;
  };
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
    return "AI Chatbox";
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

async function getSecurityDashboardData() {
  const prisma = getPrisma();

  const [
    securityEventsCount,
    accessLogsCount,
    criticalCount,
    warningCount,
    infoCount,
    rateLimitCount,
    serverErrorCount,
    quickOfferAccessCount,
    aiChatAccessCount,
    failedAccessCount,
    latestSecurityEvents,
    latestAccessLogs,
    suspiciousFingerprints,
  ] = await Promise.all([
    prisma.publicSecurityEvent.count(),
    prisma.publicAccessLog.count(),
    prisma.publicSecurityEvent.count({
      where: {
        severity: "critical",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        severity: "warning",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        severity: "info",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        reason: "rate_limit_exceeded",
      },
    }),
    prisma.publicSecurityEvent.count({
      where: {
        reason: "server_error",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        scope: "quick_offer_contact",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        scope: "ai_chat_lead",
      },
    }),
    prisma.publicAccessLog.count({
      where: {
        success: false,
      },
    }),
    prisma.publicSecurityEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    }),
    prisma.publicAccessLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    }),
    prisma.publicAccessLog.groupBy({
      by: ["fingerprintHash"],
      where: {
        fingerprintHash: {
          not: null,
        },
      },
      _count: {
        fingerprintHash: true,
      },
      orderBy: {
        _count: {
          fingerprintHash: "desc",
        },
      },
      take: 10,
    }),
  ]);

  return {
    securityEventsCount,
    accessLogsCount,
    criticalCount,
    warningCount,
    infoCount,
    rateLimitCount,
    serverErrorCount,
    quickOfferAccessCount,
    aiChatAccessCount,
    failedAccessCount,
    latestSecurityEvents,
    latestAccessLogs,
    suspiciousFingerprints,
  };
}

export default async function SecurityDashboardPage() {
  const data = await getSecurityDashboardData();

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
                Podgląd publicznych requestów, zdarzeń bezpieczeństwa,
                rate-limitów i błędów formularzy QuickOffer oraz AI Chatbox.
                Dane techniczne są hashowane, bez surowego IP i bez surowego
                kontaktu klienta w access logach.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>Status:</strong> persistent logs active
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Security events"
            value={data.securityEventsCount}
            description="Trwałe zdarzenia bezpieczeństwa."
          />
          <Card
            title="Access logs"
            value={data.accessLogsCount}
            description="Publiczne requesty zapisane w DB."
            tone="success"
          />
          <Card
            title="Critical"
            value={data.criticalCount}
            description="Server error albo krytyczne zdarzenia."
            tone={data.criticalCount > 0 ? "critical" : "success"}
          />
          <Card
            title="Rate limit"
            value={data.rateLimitCount}
            description="Przekroczone limity formularzy."
            tone={data.rateLimitCount > 0 ? "warning" : "success"}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Warnings"
            value={data.warningCount}
            description="Zdarzenia ostrzegawcze."
            tone={data.warningCount > 0 ? "warning" : "success"}
          />
          <Card
            title="Info"
            value={data.infoCount}
            description="Błędy walidacji i invalid body."
          />
          <Card
            title="Failed access"
            value={data.failedAccessCount}
            description="Requesty zakończone niepowodzeniem."
            tone={data.failedAccessCount > 0 ? "warning" : "success"}
          />
          <Card
            title="Server errors"
            value={data.serverErrorCount}
            description="Błędy 500 z publicznych endpointów."
            tone={data.serverErrorCount > 0 ? "critical" : "success"}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              QuickOffer access
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {data.quickOfferAccessCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Requesty z formularza szybkiej wyceny.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              AI Chatbox access
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {data.aiChatAccessCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Requesty z formularza AI Chatbox.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            title="Podejrzane / aktywne fingerprinty"
            description="Najczęściej występujące fingerprinty requestów. To pomaga wykryć spam albo automaty."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Requesty</th>
                  <th className="px-4 py-3">Ocena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.suspiciousFingerprints.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={3}>
                      Brak danych.
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
                              ? "wysoka aktywność"
                              : count >= 8
                                ? "obserwować"
                                : "normalnie"}
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
            title="Ostatnie security events"
            description="Krytyczne i ostrzegawcze zdarzenia z publicznych endpointów."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Źródło</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.latestSecurityEvents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>
                      Brak security events.
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
            title="Ostatnie public access logs"
            description="Ostatnie requesty publicznych formularzy i endpointów."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Źródło</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Rate limit</th>
                  <th className="px-4 py-3">Response</th>
                  <th className="px-4 py-3">Fingerprint</th>
                  <th className="px-4 py-3">Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.latestAccessLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={8}>
                      Brak access logów.
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
                              ? `allowed / left ${log.rateLimitRemaining ?? "-"}`
                              : `blocked / retry ${log.retryAfterSeconds ?? "-"}s`}
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
            title="Analiza aktualnego poziomu"
            description="Krótka ocena po dodaniu persistent security logs."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-semibold text-emerald-900">
                Co działa dobrze
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Publiczne endpointy mają rate-limit, bezpieczne odpowiedzi,
                no-store cache i trwały zapis zdarzeń do bazy.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">
                Co obserwować
              </h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Wysoką liczbę jednego fingerprintu, błędy walidacji, 429 oraz
                wzrost requestów z jednego źródła.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-950">
                Co jeszcze brakuje
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Filtry, osobne podstrony szczegółów, alerty oraz retencja/czyszczenie
                starych logów.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}