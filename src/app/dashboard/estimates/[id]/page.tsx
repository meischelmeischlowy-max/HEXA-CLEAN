import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimatePrimaryAction from "../../../../components/dashboard/EstimatePrimaryAction";
import {
  RecordWorkspace,
  RecordWorkspacePanel,
  WorkspaceMetaPill,
} from "../../../../components/dashboard/RecordWorkspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type NotificationItem = {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  subject: string | null;
  message: string;
  createdAt: Date;
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
  if (value === null || value === undefined) return 0;

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

function normalizeCurrency(value?: string | null) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;
  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function formatMoney(value: unknown, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";

  return value.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatFileSize(value: number | null | undefined) {
  if (!value || value <= 0) {
    return "Größe unbekannt";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email?: string | null;
  phone?: string | null;
} | null) {
  if (!customer) return "Kein Kunde";

  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "Kein Kunde";
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    AI_REVIEW: "KI-Prüfung",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Interne Prüfung",
    READY_TO_SEND: "Bereit für Offerte",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    EXPIRED: "Abgelaufen",
  };

  if (!status) return "-";

  return labels[status] ?? status;
}

function sourceLabel(source: string | null | undefined) {
  const labels: Record<string, string> = {
    QUICK_OFFER: "QuickOffer Website",
    CHATBOT: "KI-Chatbox",
    ADMIN: "Dashboard",
    PUBLIC_FORM: "Public Form",
    IMPORT: "Import",
  };

  if (!source) return "Unbekannte Quelle";

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

function metadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  if (!(key in metadata)) return null;

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value !== "string") return null;

  return value.trim() || null;
}

function metadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  if (!(key in metadata)) return null;

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
  if (value === true) return "Ja";
  if (value === false) return "Nein";
  return "-";
}

function unitLabel(value: unknown) {
  if (typeof value !== "string") return "-";

  const normalized = value.trim().toUpperCase();

  const labels: Record<string, string> = {
    H: "Std.",
    HOUR: "Std.",
    HOURS: "Std.",
    M2: "m²",
    SQM: "m²",
    PIECE: "Stk.",
    PIECES: "Stk.",
    STK: "Stk.",
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
    AI: "AI",
    SEND: "Gesendet",
    ACCEPT: "Akzeptiert",
    REJECT: "Abgelehnt",
  };

  if (!action) return "Ereignis";

  return labels[action] ?? action;
}

function auditStatusChange(before: unknown, after: unknown) {
  const beforeStatus = metadataText(before, "status");
  const afterStatus = metadataText(after, "status");

  if (!beforeStatus && !afterStatus) return null;

  return `${statusLabel(beforeStatus)} -> ${statusLabel(afterStatus)}`;
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
      <div className="mt-2 break-words text-sm font-semibold text-neutral-100">
        {value}
      </div>
    </div>
  );
}

function ReviewChecklist({
  leadType,
  status,
}: {
  leadType: "quick_offer" | "chatbot" | "manual";
  status?: string | null;
}) {
  const baseItems =
    leadType === "quick_offer"
      ? [
          "Kontakt prüfen: Telefon oder E-Mail muss erreichbar sein.",
          "Leistungsumfang prüfen: Fläche, Zusatzleistungen und Termin plausibel?",
          "Anfahrt, Material, Risiko und Zeitaufwand ergänzen.",
          "Bei Unsicherheit Fotos oder Rückfrage beim Kunden anfordern.",
        ]
      : leadType === "chatbot"
        ? [
            "Chatverlauf prüfen: Hat der Kunde wirklich eine konkrete Anfrage gestellt?",
            "Kontakt prüfen: Telefon oder E-Mail muss erreichbar sein.",
            "Angaben aus dem Chat prüfen: Leistung, Fläche, Fenster, Etage, Termin.",
            "KI-Preis ist nur Orientierung: Risiko, Anfahrt, Material und Zeitaufwand prüfen.",
          ]
        : [
            "Positionen prüfen.",
            "Preis, Risiko, Rabatt und Anfahrt kontrollieren.",
            "Kundennotiz und interne Notiz prüfen.",
            "Erst nach Kontrolle für Offerte freigeben.",
          ];

  const statusItem =
    status === "READY_TO_SEND"
      ? "Die Kalkulation ist freigegeben. Die Hauptaktion oben erstellt und öffnet die Offerte."
      : status === "SENT"
        ? "Der Kundenprozess läuft. Weitere Statusänderungen erfolgen automatisch."
        : "Nach der fachlichen Kontrolle nur die eine Hauptaktion oben ausführen.";

  return (
    <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/80">
        Kontrollliste
      </p>
      <h3 className="mt-2 text-xl font-black text-amber-50">
        Interne Prüfung vor Offerte
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[...baseItems, statusItem].map((item, index) => (
          <div
            key={item}
            className="flex gap-3 rounded-2xl border border-amber-300/15 bg-black/20 p-3 text-sm leading-5 text-amber-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-neutral-950">
              {index + 1}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunicationStatusPanel({
  status,
  sentAt,
  acceptedAt,
  rejectedAt,
  notifications,
}: {
  status?: string | null;
  sentAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  notifications: NotificationItem[];
}) {
  const normalizedStatus = String(status || "").toUpperCase();
  const latestNotification = notifications[0] ?? null;
  const hasSendEvidence = Boolean(sentAt || latestNotification);

  const isWaiting =
    normalizedStatus === "SENT" ||
    normalizedStatus === "ACCEPTED" ||
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "EXPIRED";

  if (!isWaiting) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          Kommunikation / Versandstatus
        </p>
        <h3 className="mt-2 text-xl font-black text-white">
          Noch nicht versendet
        </h3>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
          Diese Kalkulation ist noch intern. Kommunikation mit dem Kunden startet
          sauber nach Freigabe und Offerte.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border p-5 ${
        hasSendEvidence
          ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          : "border-amber-300/25 bg-amber-300/10 text-amber-100"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
            Kommunikation / Versandstatus
          </p>

          <h3 className="mt-2 text-xl font-black text-white">
            {hasSendEvidence
              ? "Kundenantwort verfolgen"
              : "Versandstatus unklar"}
          </h3>

          <p className="mt-2 max-w-4xl text-sm leading-6 opacity-80">
            {hasSendEvidence
              ? "Der Vorgang ist als versendet dokumentiert. Jetzt Antwort über E-Mail, Kundenlink, Chat oder Rückfrage prüfen."
              : "Der Status steht auf Versendet, aber es wurde kein eindeutiger Versandnachweis gefunden. E-Mail, Kundenlink oder Notification im Offertenprozess prüfen."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/quotes"
            className="rounded-2xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Offerten öffnen
          </Link>

          <Link
            href="/dashboard/notifications"
            className="rounded-2xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Versandlog prüfen
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoLine label="Gesendet am" value={formatDate(sentAt ?? null)} />
        <InfoLine
          label="Akzeptiert am"
          value={formatDate(acceptedAt ?? null)}
        />
        <InfoLine
          label="Abgelehnt am"
          value={formatDate(rejectedAt ?? null)}
        />
        <InfoLine label="Notifications" value={notifications.length} />
      </div>

      {latestNotification ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
            Letzter Versand / letzte Nachricht
          </p>
          <p className="mt-2 text-sm font-black text-white">
            {latestNotification.subject || latestNotification.recipient}
          </p>
          <p className="mt-1 text-xs leading-5 opacity-70">
            {latestNotification.channel} / {latestNotification.status} /{" "}
            {latestNotification.recipient} /{" "}
            {formatDate(latestNotification.createdAt)}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 opacity-80">
            {latestNotification.message}
          </p>
        </div>
      ) : null}
    </div>
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
      attachments: {
        orderBy: {
          createdAt: "desc",
        },
      },
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

  const isQuickOffer = isQuickOfferSource(estimate.source);
  const isChatbot = isChatbotSource(estimate.source);

  const quickOfferSessionMetadata = estimate.session?.metadata ?? null;
  const quickOfferMessageMetadata =
    conversationMessages[0]?.metadata ?? null;

  const quickOfferService =
    metadataValue(quickOfferSessionMetadata, "service") ??
    metadataValue(quickOfferMessageMetadata, "service") ??
    estimate.title ??
    "-";

  const quickOfferSize =
    metadataValue(quickOfferSessionMetadata, "size") ??
    metadataValue(quickOfferMessageMetadata, "size");

  const quickOfferTime =
    metadataValue(quickOfferSessionMetadata, "time") ??
    metadataValue(quickOfferMessageMetadata, "time");

  const quickOfferMin =
    metadataValue(
      quickOfferSessionMetadata,
      "calculatedMinPrice",
    ) ??
    metadataValue(
      quickOfferMessageMetadata,
      "calculatedMinPrice",
    );

  const quickOfferMax =
    metadataValue(
      quickOfferSessionMetadata,
      "calculatedMaxPrice",
    ) ??
    metadataValue(
      quickOfferMessageMetadata,
      "calculatedMaxPrice",
    );

  const chatMetadata = estimate.session?.metadata ?? null;
  const chatAnswers = metadataObject(chatMetadata, "answers");

  const chatbotService =
    metadataValue(chatMetadata, "serviceLabel") ??
    metadataValue(chatAnswers, "serviceLabel") ??
    estimate.title ??
    "-";
  const chatbotArea = metadataValue(chatAnswers, "area");
  const chatbotWindows = metadataValue(chatAnswers, "windows");
  const chatbotFloor = metadataValue(chatAnswers, "floor");
  const chatbotElevator = metadataValue(chatAnswers, "elevator");
  const chatbotOven = metadataValue(chatAnswers, "oven");
  const chatbotBalcony = metadataValue(chatAnswers, "balcony");
  const chatbotFrequency = metadataValue(chatAnswers, "frequency");
  const chatbotDescription = metadataValue(chatAnswers, "description");
  const chatbotDate = metadataValue(chatAnswers, "date");

  const serviceAddress = [
    estimate.serviceStreet,
    [estimate.serviceZipCode, estimate.serviceCity].filter(Boolean).join(" "),
    estimate.serviceCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const customerContact =
    estimate.customer?.email ?? estimate.customer?.phone ?? "Kein Kontakt";

  const reviewLeadType = isQuickOffer
    ? "quick_offer"
    : isChatbot
      ? "chatbot"
      : "manual";

  const notifications = estimate.notifications.map((notification) => ({
    id: notification.id,
    channel: notification.channel,
    status: notification.status,
    recipient: notification.recipient,
    subject: notification.subject,
    message: notification.message,
    createdAt: notification.createdAt,
  }));

  const leadTone = isQuickOffer ? "fuchsia" : isChatbot ? "violet" : "neutral";

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-none flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/estimates"
              className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
            >
              Zurück zu den Kalkulationen
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS CRM / Kalkulation Workspace
            </p>

            <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-white">
              {estimate.estimateNumber}
            </h1>

            <p className="mt-2 max-w-5xl text-sm leading-6 text-zinc-400">
              Kurzer Entscheidungsbereich oben. Details liegen in Panels:
              Anfrage, Kunde, Preis, Kommunikation, Verlauf und System.
              Immer nur ein Arbeitsbereich ist gleichzeitig geöffnet.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceBadgeClass(
                  estimate.source,
                )}`}
              >
                {sourceLabel(estimate.source)}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-300">
                {statusLabel(estimate.status)}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-300">
                {formatMoney(estimate.total, estimate.currency)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/customers/${estimate.customerId}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07]"
            >
              Kunde öffnen
            </Link>

            {estimate.order?.id ? (
              <Link
                href={`/dashboard/orders/${estimate.order.id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07]"
              >
                Auftrag öffnen
              </Link>
            ) : null}
          </div>
        </div>

        <EstimatePrimaryAction
          estimateId={estimate.id}
          currentStatus={String(estimate.status)}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <InfoLine label="Kunde" value={customerName(estimate.customer)} />
          <InfoLine label="Kontakt" value={customerContact} />
          <InfoLine
            label="Leistungsort"
            value={serviceAddress || estimate.serviceCity || "-"}
          />
          <InfoLine
            label="Positionen"
            value={`${estimate.items.length} Positionen`}
          />
          <InfoLine
            label="Interne Summe"
            value={formatMoney(estimate.total, estimate.currency)}
          />
        </section>

        <RecordWorkspace
          title="Kalkulation Workspace"
          description="Sechs klare Arbeitsbereiche. Beim Öffnen eines Panels wird das vorherige automatisch geschlossen."
        >
          <RecordWorkspacePanel
            id="anfrage"
            eyebrow="Lead / Anfrage"
            defaultOpen
            title="Anfrage"
            description="Quelle, Wunschleistung, Kundentext und interne Kontrollliste."
            tone={leadTone}
            meta={
              <>
                <WorkspaceMetaPill label={sourceLabel(estimate.source)} tone={leadTone} />
                <WorkspaceMetaPill
                  label={statusLabel(estimate.status)}
                  tone="neutral"
                />
                <WorkspaceMetaPill
                  label={`${estimate.attachments.length} Fotos / Uploads`}
                  tone={
                    estimate.attachments.length > 0
                      ? "green"
                      : estimate.status === "NEEDS_PHOTOS"
                        ? "amber"
                        : "neutral"
                  }
                />
              </>
            }
          >
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                {isQuickOffer ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100/80">
                      QuickOffer Lead
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-fuchsia-50">
                      Anfrage aus dem öffentlichen Formular
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-fuchsia-50/80">
                      Diese Daten sind nur Grundlage für die interne
                      Kalkulation. Vor einer Offerte müssen Umfang, Risiko,
                      Material, Anfahrt und Preis geprüft werden.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <InfoLine
                        label="Leistung"
                        value={String(quickOfferService)}
                      />
                      <InfoLine
                        label="Größe"
                        value={
                          quickOfferSize ? `${String(quickOfferSize)} m²` : "-"
                        }
                      />
                      <InfoLine
                        label="Termin"
                        value={quickOfferTime ? String(quickOfferTime) : "-"}
                      />
                      <InfoLine label="Kontakt" value={customerContact} />
                      <InfoLine
                        label="Website-Spanne"
                        value={
                          quickOfferMin || quickOfferMax
                            ? `CHF ${String(quickOfferMin ?? "-")} - ${String(
                                quickOfferMax ?? "-",
                              )}`
                            : `${formatMoney(
                                estimate.aiMinTotal,
                                estimate.currency,
                              )} - ${formatMoney(
                                estimate.aiMaxTotal,
                                estimate.currency,
                              )}`
                        }
                      />
                    </div>
                  </>
                ) : null}

                {isChatbot ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-100/80">
                      Chatbot Lead
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-violet-50">
                      Anfrage aus der KI-Chatbox
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-violet-50/80">
                      Chatbot-Daten sind Arbeitsmaterial. Vor einer Offerte muss
                      der Verlauf geprüft und bei Unsicherheit Rückfrage oder
                      Foto-Upload angefordert werden.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <InfoLine label="Leistung" value={String(chatbotService)} />
                      <InfoLine
                        label="Fläche"
                        value={chatbotArea ? `${String(chatbotArea)} m²` : "-"}
                      />
                      <InfoLine
                        label="Fenster"
                        value={chatbotWindows ? String(chatbotWindows) : "-"}
                      />
                      <InfoLine label="Kontakt" value={customerContact} />
                      <InfoLine
                        label="Etage"
                        value={chatbotFloor ? String(chatbotFloor) : "-"}
                      />
                      <InfoLine
                        label="Lift"
                        value={yesNoLabel(chatbotElevator)}
                      />
                      <InfoLine
                        label="Backofen"
                        value={yesNoLabel(chatbotOven)}
                      />
                      <InfoLine
                        label="Balkon/Terrasse"
                        value={yesNoLabel(chatbotBalcony)}
                      />
                      <InfoLine
                        label="Rhythmus"
                        value={chatbotFrequency ? String(chatbotFrequency) : "-"}
                      />
                      <InfoLine
                        label="Wunschtermin"
                        value={chatbotDate ? String(chatbotDate) : "-"}
                      />
                      <InfoLine
                        label="Beschreibung"
                        value={
                          chatbotDescription
                            ? String(chatbotDescription)
                            : "-"
                        }
                      />
                    </div>
                  </>
                ) : null}

                {!isQuickOffer && !isChatbot ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                      Manuelle Kalkulation
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">
                      Intern angelegte Kalkulation
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Diese Kalkulation wurde nicht als QuickOffer oder
                      Chatbot-Lead erkannt. Positionen, Notizen und Kundendaten
                      manuell prüfen.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <InfoLine label="Titel" value={estimate.title ?? "-"} />
                      <InfoLine
                        label="Quelle"
                        value={sourceLabel(estimate.source)}
                      />
                      <InfoLine
                        label="Status"
                        value={statusLabel(estimate.status)}
                      />
                      <InfoLine
                        label="Erstellt"
                        value={formatDate(estimate.createdAt)}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="space-y-5">
                <ReviewChecklist
                  leadType={reviewLeadType}
                  status={estimate.status}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
                        Fotos / Uploads
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        Nachweise zur Anfrage
                      </h3>
                    </div>

                    <WorkspaceMetaPill
                      label={`${estimate.attachments.length} vorhanden`}
                      tone={
                        estimate.attachments.length > 0
                          ? "green"
                          : estimate.status === "NEEDS_PHOTOS"
                            ? "amber"
                            : "neutral"
                      }
                    />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {estimate.attachments.length > 0
                      ? "Diese Fotos müssen vor der Preisfreigabe geprüft werden."
                      : estimate.status === "NEEDS_PHOTOS"
                        ? "Fotos fehlen. Kunde kontaktieren und Uploads anfordern."
                        : "Keine Uploads vorhanden. Bei Preisunsicherheit Fotos anfordern."}
                  </p>

                  {estimate.attachments.length > 0 ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {estimate.attachments.map((attachment) => (
                        <article
                          key={attachment.id}
                          className="overflow-hidden rounded-2xl border border-white/10 bg-black/25"
                        >
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block"
                          >
                            <div className="aspect-[4/3] overflow-hidden bg-black/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={attachment.url}
                                alt={
                                  attachment.fileName ||
                                  "Kundenfoto zur Anfrage"
                                }
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              />
                            </div>

                            <div className="p-4">
                              <p className="truncate text-sm font-black text-white">
                                {attachment.fileName ||
                                  "Kundenfoto"}
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {formatFileSize(
                                  attachment.sizeBytes,
                                )}
                                {attachment.mimeType
                                  ? ` · ${attachment.mimeType}`
                                  : ""}
                              </p>

                              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                                Foto öffnen
                              </p>
                            </div>
                          </a>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </RecordWorkspacePanel>

          <RecordWorkspacePanel
            id="kundendaten"
            eyebrow="Kunde / Adresse"
            title="Kunde"
            description="Kontakt, Adresse und Links zum Kundenprofil."
            tone="cyan"
            meta={
              <>
                <WorkspaceMetaPill label={customerName(estimate.customer)} tone="cyan" />
                <WorkspaceMetaPill label={customerContact} tone="neutral" />
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoLine label="Kunde" value={customerName(estimate.customer)} />
              <InfoLine label="Kontakt" value={customerContact} />
              <InfoLine
                label="E-Mail"
                value={estimate.customer?.email ?? "-"}
              />
              <InfoLine
                label="Telefon"
                value={estimate.customer?.phone ?? "-"}
              />
              <InfoLine
                label="Leistungsort"
                value={serviceAddress || estimate.serviceCity || "-"}
              />
              <InfoLine
                label="Straße"
                value={estimate.serviceStreet ?? "-"}
              />
              <InfoLine
                label="PLZ / Ort"
                value={
                  [estimate.serviceZipCode, estimate.serviceCity]
                    .filter(Boolean)
                    .join(" ") || "-"
                }
              />
              <InfoLine
                label="Land"
                value={estimate.serviceCountry ?? "-"}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/customers/${estimate.customerId}`}
                className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Kundenprofil öffnen
              </Link>

              <Link
                href={`/dashboard/customers/${estimate.customerId}/edit`}
                className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-white/10"
              >
                Kundendaten bearbeiten
              </Link>
            </div>
          </RecordWorkspacePanel>

          <RecordWorkspacePanel
            id="preisberechnung"
            eyebrow="Preis / Risiko"
            title="Preis"
            description="Positionen, Faktoren, KI-Spanne, Notizen und interne Summe."
            tone="green"
            count={estimate.items.length}
            meta={
              <>
                <WorkspaceMetaPill
                  label={formatMoney(estimate.total, estimate.currency)}
                  tone="green"
                />
                <WorkspaceMetaPill
                  label={`${estimate.items.length} Positionen`}
                  tone="neutral"
                />
              </>
            }
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">
                    Kalkulationspositionen
                  </h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    Interne Positionen für Preis, Risiko, Aufwand und Total.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  Vor der Offerte prüfen und freigeben.
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
                      const unit = manualUnit ?? item.unit ?? "-";

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-neutral-100">
                              {item.name}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {item.description ?? item.category ?? "-"}
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
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              <InfoLine
                label="Zwischensumme"
                value={formatMoney(estimate.subtotal, estimate.currency)}
              />
              <InfoLine
                label="Risiko / Aufwand"
                value={formatMoney(estimate.riskAmount, estimate.currency)}
              />
              <InfoLine
                label="Anfahrt"
                value={formatMoney(estimate.travelFee, estimate.currency)}
              />
              <InfoLine
                label="Material"
                value={formatMoney(estimate.materialFee, estimate.currency)}
              />
              <InfoLine
                label="Total"
                value={formatMoney(estimate.total, estimate.currency)}
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xl font-black text-white">
                  KI-Spanne / Prüfung
                </h3>

                {estimate.aiMinTotal !== null || estimate.aiMaxTotal !== null ? (
                  <p className="mt-4 text-2xl font-black text-cyan-200">
                    {formatMoney(estimate.aiMinTotal, estimate.currency)} -{" "}
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

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xl font-black text-white">Notizen</h3>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Für Kunden
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {estimate.notesCustomer ?? "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Intern
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {estimate.notesInternal ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RecordWorkspacePanel>

          <RecordWorkspacePanel
            id="kommunikation"
            eyebrow="Kundenantwort / Nachrichten"
            title="Kommunikation"
            description="Versandstatus, Notifications und Chat-/QuickOffer-Nachrichten."
            tone="cyan"
            count={conversationMessages.length}
            meta={
              <>
                <WorkspaceMetaPill
                  label={`${notifications.length} Notifications`}
                  tone="cyan"
                />
                <WorkspaceMetaPill
                  label={`${conversationMessages.length} Nachrichten`}
                  tone="neutral"
                />
              </>
            }
          >
            <CommunicationStatusPanel
              status={estimate.status}
              sentAt={estimate.sentAt}
              acceptedAt={estimate.acceptedAt}
              rejectedAt={estimate.rejectedAt}
              notifications={notifications}
            />

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xl font-black text-white">
                Kontakt / Verlauf
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Nachrichten aus QuickOffer, Chatbot oder Session. Nur Kontext
                für diese Kalkulation.
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
          </RecordWorkspacePanel>

          <RecordWorkspacePanel
            id="verlauf"
            eyebrow="Prozess / Verknuepfungen"
            title="Verlauf"
            description="Verknuepfte Datensätze und Änderungshistorie."
            tone="neutral"
            count={estimate.auditLogs.length}
            meta={
              <>
                <WorkspaceMetaPill
                  label={`${estimate.auditLogs.length} Audit Logs`}
                  tone="neutral"
                />
                <WorkspaceMetaPill
                  label={estimate.order?.orderNumber ?? "Kein Auftrag"}
                  tone="neutral"
                />
              </>
            }
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xl font-black text-white">
                Verknuepfte Datensätze
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Diese Kalkulation ist mit Kunde, Session und optional Auftrag
                verbunden.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoLine label="Customer ID" value={estimate.customerId} />
                <InfoLine label="Order ID" value={estimate.orderId ?? "-"} />
                <InfoLine label="Session ID" value={estimate.sessionId ?? "-"} />
                <InfoLine
                  label="Order Number"
                  value={estimate.order?.orderNumber ?? "-"}
                />
                <InfoLine
                  label="Session Status"
                  value={estimate.session?.status ?? "-"}
                />
                <InfoLine
                  label="Session Source"
                  value={estimate.session?.source ?? "-"}
                />
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xl font-black text-white">
                Änderungshistorie
              </h3>

              {estimate.auditLogs.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
                  Keine Änderungshistorie.
                </div>
              ) : (
                <div className="mt-5 max-h-[520px] space-y-4 overflow-auto pr-2">
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
                              {log.actorType ?? "System"} /{" "}
                              {log.entityType ?? "Estimate"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </RecordWorkspacePanel>

          <RecordWorkspacePanel
            id="system-technik"
            eyebrow="Debug / Technik"
            title="System"
            description="Technische Zählung für Uploads, Notifications und Logs. Nicht für tägliche Arbeit."
            tone="amber"
            meta={
              <>
                <WorkspaceMetaPill
                  label={`${estimate.attachments.length} Anhaenge`}
                  tone="neutral"
                />
                <WorkspaceMetaPill
                  label={`${estimate.notifications.length} Notifications`}
                  tone="neutral"
                />
                <WorkspaceMetaPill
                  label={`${estimate.auditLogs.length} Audit Logs`}
                  tone="neutral"
                />
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <InfoLine label="Anhaenge" value={estimate.attachments.length} />
              <InfoLine
                label="Benachrichtigungen"
                value={estimate.notifications.length}
              />
              <InfoLine label="Audit Logs" value={estimate.auditLogs.length} />
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-xl font-black text-white">
                Technischer Hinweis
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Systemdaten bleiben hier gesammelt. Die normale Arbeit laeuft
                über Nächste Aktion, Status und die Panels oben.
              </p>
            </div>
          </RecordWorkspacePanel>
        </RecordWorkspace>
      </section>
    </main>
  );
}
