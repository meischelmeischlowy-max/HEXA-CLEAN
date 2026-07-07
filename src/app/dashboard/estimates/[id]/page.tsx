import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimateStatusActions from "../../../../components/dashboard/EstimateStatusActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
    });
  }

  return globalForPrisma.hexaPrisma;
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatMoney(value: unknown, currency = "CHF") {
  const number = decimalToNumber(value);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(number);
}

function formatNumber(value: unknown) {
  const number = decimalToNumber(value);

  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    AI_REVIEW: "KI-Prüfung",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Interne Prüfung erforderlich",
    READY_TO_SEND: "Bereit zum Senden",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    EXPIRED: "Abgelaufen",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function statusDescription(status: string | null | undefined) {
  const descriptions: Record<string, string> = {
    DRAFT: "Die Kalkulation ist noch in Vorbereitung.",
    AI_REVIEW: "Die Kalkulation ist für spätere KI-Prüfung markiert.",
    NEEDS_PHOTOS: "Für eine zuverlässige Kalkulation werden Fotos benötigt.",
    NEEDS_HUMAN_REVIEW:
      "Die Kalkulation muss intern geprüft werden, bevor sie versendet wird.",
    READY_TO_SEND: "Die Kalkulation ist geprüft und kann als Angebot vorbereitet werden.",
    SENT: "Das Angebot wurde an den Kunden gesendet.",
    ACCEPTED: "Der Kunde hat die Kalkulation akzeptiert.",
    REJECTED: "Der Kunde hat die Kalkulation abgelehnt.",
    EXPIRED: "Die Kalkulation ist abgelaufen.",
  };

  if (!status) {
    return "Kein Status vorhanden.";
  }

  return descriptions[status] ?? "Status im System gespeichert.";
}

function statusBadgeClass(status: string | null | undefined) {
  if (status === "ACCEPTED") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }

  if (status === "REJECTED" || status === "EXPIRED") {
    return "border-red-300/30 bg-red-300/10 text-red-100";
  }

  if (status === "SENT" || status === "READY_TO_SEND") {
    return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
  }

  return "border-white/10 bg-white/[0.03] text-neutral-100";
}

function metadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  if (!(key in metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}

function unitLabel(value: unknown) {
  if (typeof value !== "string") {
    return "—";
  }

  const normalized = value.trim().toUpperCase();

  const labels: Record<string, string> = {
    H: "Std.",
    HOUR: "Std.",
    HOURS: "Std.",
    M2: "m²",
    "M²": "m²",
    SQM: "m²",
    PIECE: "Stk.",
    PIECES: "Stk.",
    STK: "Stk.",
    STÜCK: "Stk.",
    ROOM: "Raum",
    WINDOW: "Fenster",
    FLAT: "Pauschal",
    FIXED: "Pauschal",
    PAUSCHAL: "Pauschal",
    KM: "km",
    CUSTOM: "Individuell",
  };

  return labels[normalized] ?? value;
}

function auditActionLabel(action: string | null | undefined) {
  const labels: Record<string, string> = {
    CREATE: "Erstellt",
    UPDATE: "Geändert",
    DELETE: "Gelöscht",
    STATUS_CHANGE: "Status geändert",
    SYSTEM: "System",
    AI: "KI",
    SEND: "Gesendet",
    ACCEPT: "Akzeptiert",
    REJECT: "Abgelehnt",
  };

  if (!action) {
    return "Ereignis";
  }

  return labels[action] ?? action;
}

function auditStatusChange(before: unknown, after: unknown) {
  const beforeStatus = metadataText(before, "status");
  const afterStatus = metadataText(after, "status");

  if (!beforeStatus && !afterStatus) {
    return null;
  }

  return `${statusLabel(beforeStatus)} → ${statusLabel(afterStatus)}`;
}

export default async function DashboardEstimateDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const estimate = await prisma.estimate.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      order: true,
      session: true,
      items: {
        include: {
          serviceCatalogItem: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      attachments: true,
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!estimate) {
    notFound();
  }

  const latestAuditLog = estimate.auditLogs[0];

  const serviceAddress = [
    estimate.serviceStreet,
    [estimate.serviceZipCode, estimate.serviceCity].filter(Boolean).join(" "),
    estimate.serviceCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const customerContact =
    estimate.customer?.email ?? estimate.customer?.phone ?? "Kein Kontakt";

  const manualAiRangeExists =
    estimate.aiMinTotal !== null || estimate.aiMaxTotal !== null;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/dashboard/estimates"
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Zurück zu den Kalkulationen
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Kalkulation
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {estimate.estimateNumber}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                {estimate.title ?? "Kalkulationsentwurf"}
              </p>
            </div>

            <div
              className={`rounded-2xl border px-5 py-4 text-right ${statusBadgeClass(
                estimate.status
              )}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                Status
              </p>
              <p className="mt-2 text-lg font-black">
                {statusLabel(estimate.status)}
              </p>
              <p className="mt-2 max-w-xs text-xs leading-5 opacity-70">
                {statusDescription(estimate.status)}
              </p>
            </div>
          </div>
        </section>

        <EstimateStatusActions
          estimateId={estimate.id}
          currentStatus={estimate.status}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href={`/dashboard/estimates/${estimate.id}/offer`}
            className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20"
          >
            Angebot öffnen
          </Link>

          <Link
            href={`/dashboard/estimates/${estimate.id}/offer`}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20"
          >
            PDF / Druckansicht
          </Link>

          <Link
            href={`/dashboard/customers/${estimate.customerId}`}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Kunde öffnen
          </Link>

          <Link
            href="/dashboard/estimates/new"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Neue Kalkulation
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Kunde</p>
            <p className="mt-2 text-xl font-semibold">
              {customerName(estimate.customer)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{customerContact}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Leistungsort</p>
            <p className="mt-2 text-xl font-semibold">
              {estimate.serviceCity ?? estimate.customer?.city ?? "—"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {serviceAddress || "Keine Adresse"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Erstellt</p>
            <p className="mt-2 text-xl font-semibold">
              {formatDate(estimate.createdAt)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Quelle: {estimate.source ?? "—"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Letzte Aktivität</p>
            <p className="mt-2 text-xl font-semibold">
              {latestAuditLog ? formatDate(latestAuditLog.createdAt) : "—"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
              {latestAuditLog?.message ?? "Keine Änderungshistorie"}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <p className="text-sm text-cyan-100/70">Kalkulationssumme</p>
            <p className="mt-2 text-3xl font-black text-cyan-100">
              {formatMoney(estimate.total, estimate.currency)}
            </p>
            <p className="mt-1 text-sm text-cyan-100/60">
              Interner Betrag vor finaler Kundenfreigabe
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kalkulationspositionen</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Positionen aus dem Leistungskatalog oder aus dem manuellen Formular.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Vor dem Versand muss die Kalkulation intern freigegeben werden.
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                <tr>
                  <th className="px-4 py-4">Leistung</th>
                  <th className="px-4 py-4">Menge</th>
                  <th className="px-4 py-4">Preis</th>
                  <th className="px-4 py-4">Faktor</th>
                  <th className="px-4 py-4">Risiko</th>
                  <th className="px-4 py-4 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {estimate.items.map((item) => {
                  const manualUnit = metadataText(item.metadata, "manualUnit");
                  const unit = manualUnit ?? item.unit ?? "—";

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-neutral-100">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.description ?? item.category ?? "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        {formatNumber(item.quantity)} {unitLabel(unit)}
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        {formatMoney(item.unitPrice, estimate.currency)}
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        x{formatNumber(item.riskMultiplier)}
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        {formatMoney(item.riskAmount, estimate.currency)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(item.total, estimate.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {estimate.items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Keine Kalkulationspositionen.
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Zwischensumme</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.subtotal, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Risiko / Aufwand</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.riskAmount, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Anfahrt</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.travelFee, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Rabatt</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.discountAmount, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300 p-5 text-neutral-950">
            <p className="text-sm font-semibold opacity-70">Total</p>
            <p className="mt-2 text-2xl font-black">
              {formatMoney(estimate.total, estimate.currency)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">KI-Spanne / Prüfung</h2>

            {manualAiRangeExists ? (
              <p className="mt-4 text-2xl font-black text-cyan-200">
                {formatMoney(estimate.aiMinTotal, estimate.currency)} –{" "}
                {formatMoney(estimate.aiMaxTotal, estimate.currency)}
              </p>
            ) : (
              <p className="mt-4 text-2xl font-black text-neutral-400">
                Keine Spanne vorhanden
              </p>
            )}

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {estimate.aiNotes ??
                "Keine KI-Analyse vorhanden. Dieser Bereich ist für spätere Fotoanalyse, Risikoanalyse und Plausibilitätsprüfung vorbereitet."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Notizen</h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Für Kunden
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {estimate.notesCustomer ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Intern
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {estimate.notesInternal ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Kalkulationshistorie</h2>
            <p className="text-sm text-neutral-400">
              Technischer Audit-Log: Erstellung, Statusänderungen und spätere
              Entscheidungen im Dashboard.
            </p>
          </div>

          {estimate.auditLogs.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Keine Änderungshistorie.
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {estimate.auditLogs.map((log) => {
                const statusChange = auditStatusChange(log.before, log.after);

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                          {auditActionLabel(log.action)}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-neutral-300">
                          {log.message ?? "Ereignis ohne Beschreibung."}
                        </p>

                        {statusChange ? (
                          <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                            Status: {statusChange}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold text-neutral-200">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                          {log.actorType ?? "System"} · {log.entityType ?? "Estimate"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Anhänge</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.attachments.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Später: Kundenfotos und Vision-AI.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Benachrichtigungen</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.notifications.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Später: E-Mail, SMS und WhatsApp.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.auditLogs.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Änderungshistorie und Entscheidungen.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}