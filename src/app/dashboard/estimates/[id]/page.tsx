import type { ReactNode } from "react";
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
    AI_REVIEW:
      "Die Kalkulation wurde automatisch vorbereitet und muss vor dem Versand geprüft werden.",
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

  if (status === "AI_REVIEW") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  return "border-white/10 bg-white/[0.03] text-neutral-100";
}

function sourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    QUICK_OFFER: "QuickOffer Website",
    CHATBOT: "AI Chatbox",
    ADMIN: "Dashboard",
    PUBLIC_FORM: "Public Form",
    IMPORT: "Import",
  };

  if (!source) {
    return "Unbekannte Quelle";
  }

  return labels[source] ?? source;
}

function sourceBadgeClass(source: string | null | undefined) {
  if (source === "QUICK_OFFER") {
    return "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100";
  }

  if (source === "CHATBOT") {
    return "border-violet-300/30 bg-violet-300/10 text-violet-100";
  }

  if (source === "ADMIN") {
    return "border-neutral-300/20 bg-white/[0.05] text-neutral-200";
  }

  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

function isQuickOfferSource(source: string | null | undefined) {
  return String(source ?? "").toUpperCase() === "QUICK_OFFER";
}

function isChatbotSource(source: string | null | undefined) {
  return String(source ?? "").toUpperCase() === "CHATBOT";
}

function isPublicLeadSource(source: string | null | undefined) {
  return isQuickOfferSource(source) || isChatbotSource(source);
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

function metadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  if (!(key in metadata)) {
    return null;
  }

  return (metadata as Record<string, unknown>)[key];
}

function metadataObject(metadata: unknown, key: string) {
  const value = metadataValue(metadata, key);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function yesNoLabel(value: unknown) {
  if (value === true) {
    return "Ja";
  }

  if (value === false) {
    return "Nein";
  }

  return "—";
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

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

function ReviewChecklist({
  leadType,
}: {
  leadType: "quick_offer" | "chatbot" | "manual";
}) {
  const items =
    leadType === "quick_offer"
      ? [
          "Kontakt prüfen: Telefon oder E-Mail ist erreichbar.",
          "Leistungsumfang prüfen: m², Zusatzleistungen und Termin plausibel.",
          "Anfahrt, Material, Risiko und Zeitaufwand ergänzen.",
          "Bei Unsicherheit Fotos oder Rückfrage beim Kunden anfordern.",
          "Erst danach Status auf READY_TO_SEND setzen und Angebot vorbereiten.",
        ]
      : leadType === "chatbot"
        ? [
            "Chatverlauf prüfen: Hat der Kunde wirklich eine Anfrage gestellt?",
            "Kontakt prüfen: Telefon oder E-Mail ist erreichbar.",
            "Angaben aus dem Chat prüfen: Leistung, Fläche, Fenster, Etage, Termin und Beschreibung.",
            "Preis ist nur AI-/Website-Schätzung: Risiko, Anfahrt, Material und Zeitaufwand manuell prüfen.",
            "Erst danach Status auf READY_TO_SEND setzen und Angebot vorbereiten.",
          ]
        : [
            "Positionen prüfen.",
            "Preis, Risiko, Rabatt und Anfahrt kontrollieren.",
            "Kundennotiz und interne Notiz prüfen.",
            "Status erst nach Kontrolle auf READY_TO_SEND setzen.",
          ];

  return (
    <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/80">
        Kontrollliste vor Versand
      </p>
      <h2 className="mt-2 text-xl font-bold text-amber-50">
        Nicht automatisch an Kunden senden
      </h2>

      <div className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex gap-3 rounded-2xl border border-amber-300/15 bg-black/20 p-4 text-sm leading-6 text-amber-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-neutral-950">
              {index + 1}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
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

  const conversationMessages = estimate.sessionId
    ? await prisma.conversationMessage.findMany({
        where: {
          sessionId: estimate.sessionId,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 50,
      })
    : [];

  const latestAuditLog = estimate.auditLogs[0];
  const isQuickOffer = isQuickOfferSource(estimate.source);
  const isChatbot = isChatbotSource(estimate.source);
  const isPublicLead = isPublicLeadSource(estimate.source);
  const firstMessage = conversationMessages[0] ?? null;

  const quickOfferMetadata =
    firstMessage?.metadata ?? estimate.session?.metadata ?? null;

  const quickOfferService =
    metadataValue(quickOfferMetadata, "service") ?? estimate.title ?? "—";
  const quickOfferSize = metadataValue(quickOfferMetadata, "size");
  const quickOfferTime = metadataValue(quickOfferMetadata, "time");
  const quickOfferMin = metadataValue(quickOfferMetadata, "calculatedMinPrice");
  const quickOfferMax = metadataValue(quickOfferMetadata, "calculatedMaxPrice");
  const quickOfferContact =
    metadataValue(quickOfferMetadata, "contact") ??
    estimate.customer?.email ??
    estimate.customer?.phone ??
    "—";

  const chatMetadata = estimate.session?.metadata ?? null;
  const chatAnswers = metadataObject(chatMetadata, "answers");

  const chatbotService =
    metadataValue(chatMetadata, "serviceLabel") ??
    metadataValue(chatAnswers, "serviceLabel") ??
    estimate.title ??
    "—";
  const chatbotArea = metadataValue(chatAnswers, "area");
  const chatbotWindows = metadataValue(chatAnswers, "windows");
  const chatbotFloor = metadataValue(chatAnswers, "floor");
  const chatbotElevator = metadataValue(chatAnswers, "elevator");
  const chatbotOven = metadataValue(chatAnswers, "oven");
  const chatbotBalcony = metadataValue(chatAnswers, "balcony");
  const chatbotFrequency = metadataValue(chatAnswers, "frequency");
  const chatbotDescription = metadataValue(chatAnswers, "description");
  const chatbotDate = metadataValue(chatAnswers, "date");
  const chatbotPriceRange =
    metadataValue(chatMetadata, "priceRange") ??
    `${formatMoney(estimate.aiMinTotal, estimate.currency)} – ${formatMoney(
      estimate.aiMaxTotal,
      estimate.currency,
    )}`;
  const chatbotPageUrl = metadataValue(chatMetadata, "pageUrl");
  const chatbotContact =
    estimate.customer?.email ?? estimate.customer?.phone ?? "—";

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

  const reviewLeadType = isQuickOffer
    ? "quick_offer"
    : isChatbot
      ? "chatbot"
      : "manual";

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

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceBadgeClass(
                    estimate.source,
                  )}`}
                >
                  {sourceLabel(estimate.source)}
                </span>

                {isQuickOffer ? (
                  <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-xs font-bold text-fuchsia-100">
                    QuickOffer Website Lead
                  </span>
                ) : null}

                {isChatbot ? (
                  <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
                    Chatbot Website Lead
                  </span>
                ) : null}

                {estimate.status === "AI_REVIEW" ? (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
                    Prüfung erforderlich
                  </span>
                ) : null}
              </div>

              <p className="mt-3 max-w-3xl text-sm text-neutral-400">
                {estimate.title ?? "Kalkulationsentwurf"}
              </p>
            </div>

            <div
              className={`rounded-2xl border px-5 py-4 text-right ${statusBadgeClass(
                estimate.status,
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

        {isQuickOffer ? (
          <section className="rounded-3xl border border-fuchsia-300/25 bg-fuchsia-300/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100/80">
                  QuickOffer Lead
                </p>
                <h2 className="mt-2 text-2xl font-black text-fuchsia-50">
                  Anfrage aus dem öffentlichen Formular
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-fuchsia-50/80">
                  Diese Kalkulation wurde automatisch aus dem Website-Formular
                  erstellt. Die Preisangabe ist nur eine Orientierung und muss
                  intern geprüft werden, bevor daraus ein offizielles Angebot
                  wird.
                </p>
              </div>

              <div className="rounded-2xl border border-fuchsia-300/20 bg-black/20 px-5 py-4 text-sm text-fuchsia-50">
                <p className="font-black">Nächster Schritt</p>
                <p className="mt-2 leading-6">
                  Umfang prüfen → Status setzen → Angebot vorbereiten.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <InfoLine label="Leistung" value={String(quickOfferService)} />
              <InfoLine
                label="Grösse"
                value={quickOfferSize ? `${String(quickOfferSize)} m²` : "—"}
              />
              <InfoLine
                label="Termin"
                value={quickOfferTime ? String(quickOfferTime) : "—"}
              />
              <InfoLine label="Kontakt" value={String(quickOfferContact)} />
              <InfoLine
                label="Website-Spanne"
                value={
                  quickOfferMin || quickOfferMax
                    ? `CHF ${String(quickOfferMin ?? "—")} – ${String(
                        quickOfferMax ?? "—",
                      )}`
                    : `${formatMoney(estimate.aiMinTotal, estimate.currency)} – ${formatMoney(
                        estimate.aiMaxTotal,
                        estimate.currency,
                      )}`
                }
              />
            </div>
          </section>
        ) : null}

        {isChatbot ? (
          <section className="rounded-3xl border border-violet-300/25 bg-violet-300/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-100/80">
                  Chatbot Lead
                </p>
                <h2 className="mt-2 text-2xl font-black text-violet-50">
                  Anfrage aus der AI Chatbox
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-50/80">
                  Diese Kalkulation wurde automatisch aus dem öffentlichen
                  Chatbot erstellt. Der Chatverlauf ist gespeichert und muss vor
                  einer offiziellen Offerte manuell geprüft werden.
                </p>
              </div>

              <div className="rounded-2xl border border-violet-300/20 bg-black/20 px-5 py-4 text-sm text-violet-50">
                <p className="font-black">Nächster Schritt</p>
                <p className="mt-2 leading-6">
                  Chat prüfen → Rückfrage/Fotos falls nötig → Angebot vorbereiten.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <InfoLine label="Leistung" value={String(chatbotService)} />
              <InfoLine
                label="Fläche"
                value={chatbotArea ? `${String(chatbotArea)} m²` : "—"}
              />
              <InfoLine
                label="Fenster"
                value={chatbotWindows ? String(chatbotWindows) : "—"}
              />
              <InfoLine
                label="Kontakt"
                value={String(chatbotContact)}
              />
              <InfoLine
                label="AI-Spanne"
                value={String(chatbotPriceRange)}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoLine
                label="Etage"
                value={chatbotFloor ? String(chatbotFloor) : "—"}
              />
              <InfoLine label="Lift" value={yesNoLabel(chatbotElevator)} />
              <InfoLine label="Backofen" value={yesNoLabel(chatbotOven)} />
              <InfoLine
                label="Balkon/Terrasse"
                value={yesNoLabel(chatbotBalcony)}
              />
              <InfoLine
                label="Rhythmus"
                value={chatbotFrequency ? String(chatbotFrequency) : "—"}
              />
              <InfoLine
                label="Wunschtermin"
                value={chatbotDate ? String(chatbotDate) : "—"}
              />
              <InfoLine
                label="Seite"
                value={chatbotPageUrl ? String(chatbotPageUrl) : "—"}
              />
              <InfoLine
                label="Beschreibung"
                value={chatbotDescription ? String(chatbotDescription) : "—"}
              />
            </div>
          </section>
        ) : null}

        <EstimateStatusActions
          estimateId={estimate.id}
          currentStatus={estimate.status}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

          {estimate.order?.id ? (
            <Link
              href={`/dashboard/orders/${estimate.order.id}`}
              className="rounded-2xl border border-violet-300/30 bg-violet-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-violet-100 transition hover:border-violet-200 hover:bg-violet-300/20"
            >
              Auftrag öffnen
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-neutral-600">
              Kein Auftrag
            </div>
          )}

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
              Quelle: {sourceLabel(estimate.source)}
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

        <ReviewChecklist leadType={reviewLeadType} />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">CRM-Verknüpfung</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Verbindung zwischen Website, Kunde, Session, Auftrag und
              Kalkulation.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoLine label="Customer ID" value={estimate.customerId} />
              <InfoLine label="Order ID" value={estimate.orderId ?? "—"} />
              <InfoLine label="Session ID" value={estimate.sessionId ?? "—"} />
              <InfoLine
                label="Order Number"
                value={estimate.order?.orderNumber ?? "—"}
              />
              <InfoLine
                label="Session Status"
                value={estimate.session?.status ?? "—"}
              />
              <InfoLine
                label="Session Source"
                value={estimate.session?.source ?? "—"}
              />
              <InfoLine
                label="Lead Typ"
                value={
                  isPublicLead
                    ? isQuickOffer
                      ? "QuickOffer"
                      : "Chatbot"
                    : "Manuell / Dashboard"
                }
              />
              <InfoLine
                label="Nachrichten"
                value={String(conversationMessages.length)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Nachrichten aus Formular / Chat</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Gespeicherte ConversationMessages der zugehörigen Session.
            </p>

            {conversationMessages.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-neutral-400">
                Keine Nachrichten zur Session gespeichert.
              </div>
            ) : (
              <div className="mt-5 max-h-[420px] space-y-4 overflow-auto pr-2">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                        {message.role}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(message.createdAt)}
                      </p>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kalkulationspositionen</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Positionen aus dem Leistungskatalog, aus dem manuellen Formular
                oder automatisch aus QuickOffer / Chatbot.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Vor dem Versand muss die Kalkulation intern freigegeben werden.
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
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
                          {log.actorType ?? "System"} ·{" "}
                          {log.entityType ?? "Estimate"}
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
              E-Mail, SMS, WhatsApp und interne Benachrichtigungen.
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