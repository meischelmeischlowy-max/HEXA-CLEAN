import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import MarkOrderAsCompletedButton from "@/components/dashboard/MarkOrderAsCompletedButton";
import ScheduleOrderButton from "@/components/dashboard/ScheduleOrderButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

const prisma =
  globalForPrisma.hexaPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? "",
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hexaPrisma = prisma;
}

type Row = Record<string, unknown>;

type PrismaModel = {
  findUnique?: (args: unknown) => Promise<unknown>;
  findMany?: (args: unknown) => Promise<unknown>;
};

const prismaAny = prisma as unknown as Record<string, PrismaModel>;

async function safeFindUnique<T = Row>(
  modelName: string,
  args: unknown,
): Promise<T | null> {
  const model = prismaAny[modelName];

  if (!model?.findUnique) {
    return null;
  }

  try {
    const result = await model.findUnique(args);
    return (result ?? null) as T | null;
  } catch {
    return null;
  }
}

async function safeFindMany<T = Row>(
  modelName: string,
  args: unknown,
): Promise<T[]> {
  const model = prismaAny[modelName];

  if (!model?.findMany) {
    return [];
  }

  try {
    const result = await model.findMany(args);
    return Array.isArray(result) ? (result as T[]) : [];
  } catch {
    return [];
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return value.toLocaleString("de-CH");
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "object") {
    const asObject = value as { toString?: () => string };
    const stringValue = asObject.toString?.();

    if (stringValue && stringValue !== "[object Object]") {
      return stringValue;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function formatMoney(value: unknown, currency: unknown = "CHF") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return formatValue(value);
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency:
      typeof currency === "string" && currency.trim()
        ? currency
        : "CHF",
  }).format(amount);
}

function customerName(customer: Row | null) {
  if (!customer) {
    return "—";
  }

  const fullName = `${customer.firstName ?? ""} ${
    customer.lastName ?? ""
  }`.trim();

  return (
    customer.companyName ??
    customer.name ??
    fullName ??
    customer.email ??
    customer.phone ??
    customer.id
  );
}

function statusLabel(status: unknown) {
  const value = String(status ?? "");

  const labels: Record<string, string> = {
    NEW: "Neu",
    OPEN: "Offen",
    PENDING: "Ausstehend",
    IN_PROGRESS: "In Bearbeitung",
    WAITING_FOR_CUSTOMER: "Wartet auf Kunden",
    CONFIRMED: "Bestätigt",
    SCHEDULED: "Geplant",
    COMPLETED: "Abgeschlossen",
    CANCELLED: "Storniert",
    PAID: "Bezahlt",
    PARTIALLY_PAID: "Teilweise bezahlt",
    UNPAID: "Unbezahlt",
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

  return labels[value] ?? formatValue(status);
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

function metadataString(metadata: unknown, key: string) {
  const value = metadataValue(metadata, key);

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").toUpperCase();
}

function isQuickOfferOrder({
  order,
  session,
  estimates,
}: {
  order: Row;
  session: Row | null;
  estimates: Row[];
}) {
  const title = String(order.title ?? "").toUpperCase();
  const description = String(order.description ?? "").toUpperCase();
  const sessionSource = String(session?.source ?? "").toUpperCase();
  const hasQuickOfferEstimate = estimates.some(
    (estimate) => String(estimate.source ?? "").toUpperCase() === "QUICK_OFFER",
  );

  return (
    title.includes("QUICKOFFER") ||
    description.includes("QUICKOFFER") ||
    sessionSource === "QUICK_OFFER" ||
    sessionSource === "QUICKOFFER" ||
    sessionSource === "PUBLIC_QUICK_OFFER" ||
    sessionSource === "QUICK_OFFER_CONTACT" ||
    sessionSource === "QUICK_OFFER_FORM" ||
    sessionSource === "QUICK_OFFER_WEBSITE" ||
    sessionSource === "QUICK_OFFER_LEAD" ||
    sessionSource === "QUICK_OFFER_PUBLIC" ||
    sessionSource === "QUICK_OFFER_CRM" ||
    sessionSource === "QUICK_OFFER_API" ||
    sessionSource === "QUICK_OFFER_FORMULAR" ||
    sessionSource === "QUICK_OFFER_FORMULARZ" ||
    hasQuickOfferEstimate
  );
}

function isChatbotOrder({
  order,
  session,
  estimates,
}: {
  order: Row;
  session: Row | null;
  estimates: Row[];
}) {
  const title = String(order.title ?? "").toUpperCase();
  const description = String(order.description ?? "").toUpperCase();
  const sessionSource = String(session?.source ?? "").toUpperCase();
  const hasChatbotEstimate = estimates.some(
    (estimate) => String(estimate.source ?? "").toUpperCase() === "CHATBOT",
  );

  return (
    title.includes("AI CHATBOX") ||
    title.includes("CHATBOT") ||
    description.includes("AI CHATBOX") ||
    description.includes("CHATBOT") ||
    sessionSource === "AI_CHAT" ||
    sessionSource === "CHATBOT" ||
    sessionSource === "PUBLIC_AI_CHAT" ||
    sessionSource === "PUBLIC_CHATBOT" ||
    hasChatbotEstimate
  );
}

function isPublicLeadOrder({
  order,
  session,
  estimates,
}: {
  order: Row;
  session: Row | null;
  estimates: Row[];
}) {
  return (
    isQuickOfferOrder({ order, session, estimates }) ||
    isChatbotOrder({ order, session, estimates })
  );
}

function needsReview({
  order,
  estimates,
  isPublicLead,
}: {
  order: Row;
  estimates: Row[];
  isPublicLead: boolean;
}) {
  const orderStatus = normalizeStatus(order.status);
  const latestEstimate = estimates[0] ?? null;
  const estimateStatus = normalizeStatus(latestEstimate?.status);

  return (
    isPublicLead &&
    (["NEW", "OPEN", "PENDING", "IN_PROGRESS"].includes(orderStatus) ||
      ["AI_REVIEW", "NEEDS_HUMAN_REVIEW", "NEEDS_PHOTOS"].includes(
        estimateStatus,
      ))
  );
}

function firstEstimate(estimates: Row[]) {
  return estimates[0] ?? null;
}

function firstMessage(conversationMessages: Row[]) {
  return conversationMessages[0] ?? null;
}

function leadMetadata({
  session,
  message,
}: {
  session: Row | null;
  message: Row | null;
}) {
  return message?.metadata ?? session?.metadata ?? null;
}

function yesNoLabel(value: unknown) {
  if (value === true) {
    return "Ja";
  }

  if (value === false) {
    return "Nein";
  }

  if (value === "true") {
    return "Ja";
  }

  if (value === "false") {
    return "Nein";
  }

  return "—";
}

function InfoCard({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4 ${
        wide ? "md:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {formatValue(value)}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: unknown;
  href?: string | null;
}) {
  const content = (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 transition hover:border-cyan-400/60 hover:bg-cyan-500/10">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-bold text-white">
        {formatValue(value)}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function ActionButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "primary" | "warning" | "quick" | "chat";
}) {
  const classes =
    variant === "primary"
      ? "border-cyan-500 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-500/20"
      : variant === "warning"
        ? "border-amber-400/50 bg-amber-400/10 text-amber-100 hover:border-amber-300 hover:bg-amber-400/20"
        : variant === "quick"
          ? "border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-100 hover:border-fuchsia-300 hover:bg-fuchsia-400/20"
          : variant === "chat"
            ? "border-violet-400/50 bg-violet-400/10 text-violet-100 hover:border-violet-300 hover:bg-violet-400/20"
            : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-cyan-500/70 hover:text-cyan-200";

  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${classes}`}
    >
      {children}
    </Link>
  );
}

function Section({
  title,
  children,
  count,
}: {
  title: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        {typeof count === "number" ? (
          <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
            {count}
          </span>
        ) : null}
      </div>

      {children}
    </section>
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
          "Kundenkontakt prüfen: Telefon oder E-Mail muss erreichbar sein.",
          "Leistungsumfang prüfen: Service, Fläche, Zusatzleistungen und Termin.",
          "Richtpreis aus dem Formular fachlich prüfen.",
          "Risiko, Anfahrt, Material und vorhandene Fotos prüfen.",
          "Verknüpfte Kalkulation öffnen und vor dem Versand fachlich freigeben.",
        ]
      : leadType === "chatbot"
        ? [
            "Kundengespräch prüfen und sicherstellen, dass es sich um eine reale Anfrage handelt.",
            "Kontakt prüfen: Telefon oder E-Mail muss erreichbar sein.",
            "Chatdaten prüfen: Leistung, Fläche, Fenster, Etage, Termin und Beschreibung.",
            "Der Chatpreis ist nur ein Richtwert — Risiko, Anfahrt, Material und Zeit prüfen.",
            "Verknüpfte Kalkulation öffnen und vor dem Versand fachlich freigeben.",
          ]
        : [
            "Auftragsdaten prüfen.",
            "Verknüpfte Kalkulationen und Rechnungen prüfen.",
            "Fehlende Kundendaten ergänzen.",
          ];

  return (
    <Section title="Prüfung vor der weiteren Bearbeitung">
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300 text-xs font-black text-neutral-950">
              {index + 1}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function MiniTable({
  title,
  items,
  basePath,
  columns,
}: {
  title: string;
  items: Row[];
  basePath?: string;
  columns: {
    label: string;
    value: (item: Row) => unknown;
    money?: boolean;
  }[];
}) {
  return (
    <Section title={title} count={items.length}>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Keine Daten.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className="border-b border-neutral-800 px-3 py-3"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="border-b border-neutral-800 px-3 py-3">
                  Aktionen
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const itemId = item.id ? String(item.id) : "";

                return (
                  <tr
                    key={itemId || `${title}-${index}`}
                    className="border-b border-neutral-800"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className="max-w-[280px] truncate px-3 py-3 text-neutral-300"
                      >
                        {column.money
                          ? formatMoney(column.value(item), item.currency)
                          : formatValue(column.value(item))}
                      </td>
                    ))}

                    <td className="px-3 py-3">
                      {basePath && itemId ? (
                        <Link
                          href={`${basePath}/${itemId}`}
                          className="rounded-full border border-cyan-500/50 px-3 py-1 text-xs font-medium text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-500/10"
                        >
                          Details
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await safeFindUnique<Row>("order", {
    where: { id },
  });

  if (!order) {
    notFound();
  }

  const [customer, session, estimates, invoices, notifications, attachments, auditLogs] =
    await Promise.all([
      order.customerId
        ? safeFindUnique<Row>("customer", {
            where: { id: order.customerId },
          })
        : Promise.resolve(null),

      order.sessionId
        ? safeFindUnique<Row>("session", {
            where: { id: order.sessionId },
          })
        : Promise.resolve(null),

      safeFindMany<Row>("estimate", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("invoice", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("notification", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("attachment", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("auditLog", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const invoiceIds = invoices
    .map((invoice) => invoice.id)
    .filter(Boolean)
    .map(String);

  const [payments, conversationMessages] = await Promise.all([
    invoiceIds.length > 0
      ? safeFindMany<Row>("payment", {
          where: {
            invoiceId: {
              in: invoiceIds,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),

    order.sessionId
      ? safeFindMany<Row>("conversationMessage", {
          where: { sessionId: order.sessionId },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const currency = String(order.currency ?? "CHF");
  const orderStatus = String(order.status ?? "");
  const completed = orderStatus === "COMPLETED";
  const confirmed = orderStatus === "CONFIRMED";
  const scheduled = orderStatus === "SCHEDULED";
  const latestEstimate = firstEstimate(estimates);
  const leadMessage = firstMessage(conversationMessages);
  const metadata = leadMetadata({
    session,
    message: leadMessage,
  });

  const quickOffer = isQuickOfferOrder({
    order,
    session,
    estimates,
  });

  const chatbot = isChatbotOrder({
    order,
    session,
    estimates,
  });

  const publicLead = isPublicLeadOrder({
    order,
    session,
    estimates,
  });

  const reviewRequired = needsReview({
    order,
    estimates,
    isPublicLead: publicLead,
  });

  const reviewLeadType = quickOffer
    ? "quick_offer"
    : chatbot
      ? "chatbot"
      : "manual";

  const quickOfferService =
    metadataString(metadata, "service") ?? order.serviceType ?? order.title ?? "—";
  const quickOfferSize = metadataString(metadata, "size");
  const quickOfferTime = metadataString(metadata, "time");
  const quickOfferMin = metadataString(metadata, "calculatedMinPrice");
  const quickOfferMax = metadataString(metadata, "calculatedMaxPrice");
  const quickOfferContact =
    metadataString(metadata, "contact") ??
    customer?.email ??
    customer?.phone ??
    "—";

  const chatAnswers = metadataObject(session?.metadata, "answers");
  const chatbotService =
    metadataString(session?.metadata, "serviceLabel") ??
    metadataString(chatAnswers, "serviceLabel") ??
    order.serviceType ??
    order.title ??
    "—";
  const chatbotArea = metadataString(chatAnswers, "area");
  const chatbotWindows = metadataString(chatAnswers, "windows");
  const chatbotFloor = metadataString(chatAnswers, "floor");
  const chatbotElevator = metadataValue(chatAnswers, "elevator");
  const chatbotOven = metadataValue(chatAnswers, "oven");
  const chatbotBalcony = metadataValue(chatAnswers, "balcony");
  const chatbotFrequency = metadataString(chatAnswers, "frequency");
  const chatbotDescription = metadataString(chatAnswers, "description");
  const chatbotDate = metadataString(chatAnswers, "date");
  const chatbotPriceRange =
    metadataString(session?.metadata, "priceRange") ??
    (latestEstimate
      ? `${formatMoney(
          latestEstimate.aiMinTotal,
          latestEstimate.currency ?? currency,
        )} – ${formatMoney(
          latestEstimate.aiMaxTotal,
          latestEstimate.currency ?? currency,
        )}`
      : "—");
  const chatbotContact = customer?.email ?? customer?.phone ?? "—";
  const chatbotPageUrl = metadataString(session?.metadata, "pageUrl");

  const totalInvoices = invoices.reduce((sum, invoice) => {
    return sum + Number(invoice.totalAmount ?? invoice.total ?? invoice.amount ?? 0);
  }, 0);

  const totalPaid = payments.reduce((sum, payment) => {
    return sum + Number(payment.amount ?? payment.paidAmount ?? 0);
  }, 0);

  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/dashboard/orders"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Zurück zu Aufträgen
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Auftrag {formatValue(order.orderNumber ?? order.number ?? order.id)}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickOffer ? (
              <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-xs font-bold text-fuchsia-100">
                QuickOffer Website Lead
              </span>
            ) : null}

            {chatbot ? (
              <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
                Chatbot Website Lead
              </span>
            ) : null}

            {reviewRequired ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
                Prüfung erforderlich
              </span>
            ) : null}

            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
              Status: {statusLabel(order.status)}
            </span>
          </div>

          <p className="mt-4 max-w-3xl text-sm text-neutral-500">
            Vollständige Ansicht des Auftrags: Kunde, Leistungsdaten, Termine,
            Kalkulationen, Rechnungen, Zahlungen, Nachrichten, Anhänge und
            Änderungsverlauf.
          </p>
        </div>

        <div
          data-testid="order-primary-action"
          className="w-full max-w-xl xl:w-auto"
        >
          <div className="rounded-2xl border border-cyan-400/20 bg-neutral-950/70 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-400">
              Nächster Schritt
            </p>

            <div className="mt-3">
              {reviewRequired && latestEstimate?.id ? (
                <ActionButton
                  href={`/dashboard/estimates/${latestEstimate.id}`}
                  variant={
                    quickOffer
                      ? "quick"
                      : chatbot
                        ? "chat"
                        : "primary"
                  }
                >
                  {publicLead
                    ? "Lead prüfen"
                    : "Kalkulation prüfen"}
                </ActionButton>
              ) : confirmed ? (
                <ScheduleOrderButton
                  orderId={String(order.id)}
                  initialStart={
                    order.scheduledStart
                      ? String(order.scheduledStart)
                      : null
                  }
                  initialEnd={
                    order.scheduledEnd
                      ? String(order.scheduledEnd)
                      : null
                  }
                />
              ) : scheduled ? (
                <MarkOrderAsCompletedButton
                  orderId={String(order.id)}
                />
              ) : completed ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                  Auftrag abgeschlossen
                </div>
              ) : latestEstimate?.id ? (
                <ActionButton
                  href={`/dashboard/estimates/${latestEstimate.id}`}
                  variant="primary"
                >
                  Kalkulation öffnen
                </ActionButton>
              ) : (
                <ActionButton
                  href={`/dashboard/orders/${order.id}/edit`}
                  variant="primary"
                >
                  Auftragsdaten vervollständigen
                </ActionButton>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-neutral-500">
              HEXA zeigt nur die aktuell erforderliche operative Aktion.
              Weitere Bereiche stehen unten als Navigation zur Verfügung.
            </p>
          </div>
        </div>
      </div>

      {quickOffer ? (
        <section className="mb-8 rounded-3xl border border-fuchsia-300/25 bg-fuchsia-300/10 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100/80">
                QuickOffer Lead
              </p>
              <h2 className="mt-2 text-2xl font-black text-fuchsia-50">
                Anfrage aus dem öffentlichen Formular
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-fuchsia-50/80">
                Dieser Auftrag wurde automatisch aus QuickOffer erstellt. Es ist
                noch keine verbindliche Offerte. Erst Daten prüfen, ggf. Kunde
                kontaktieren, dann die Kalkulation freigeben.
              </p>
            </div>

            {latestEstimate?.id ? (
              <ActionButton
                href={`/dashboard/estimates/${latestEstimate.id}`}
                variant="quick"
              >
                Verknüpfte Kalkulation öffnen
              </ActionButton>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <InfoCard label="Leistung" value={quickOfferService} />
            <InfoCard
              label="Grösse"
              value={quickOfferSize ? `${quickOfferSize} m²` : "—"}
            />
            <InfoCard label="Termin" value={quickOfferTime ?? "—"} />
            <InfoCard label="Kontakt" value={quickOfferContact} />
            <InfoCard
              label="Website-Spanne"
              value={
                quickOfferMin || quickOfferMax
                  ? `CHF ${quickOfferMin ?? "—"} – ${quickOfferMax ?? "—"}`
                  : latestEstimate
                    ? `${formatMoney(
                        latestEstimate.aiMinTotal,
                        latestEstimate.currency ?? currency,
                      )} – ${formatMoney(
                        latestEstimate.aiMaxTotal,
                        latestEstimate.currency ?? currency,
                      )}`
                    : "—"
              }
            />
          </div>
        </section>
      ) : null}

      {chatbot ? (
        <section className="mb-8 rounded-3xl border border-violet-300/25 bg-violet-300/10 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-100/80">
                Chatbot Lead
              </p>
              <h2 className="mt-2 text-2xl font-black text-violet-50">
                Anfrage aus der AI Chatbox
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-50/80">
                Dieser Auftrag wurde automatisch aus dem öffentlichen Chatbot
                erstellt. Chatverlauf und Kundendaten sind im CRM gespeichert.
                Vor einer offiziellen Offerte muss alles manuell geprüft werden.
              </p>
            </div>

            {latestEstimate?.id ? (
              <ActionButton
                href={`/dashboard/estimates/${latestEstimate.id}`}
                variant="chat"
              >
                Chatbot-Kalkulation öffnen
              </ActionButton>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <InfoCard label="Leistung" value={chatbotService} />
            <InfoCard
              label="Fläche"
              value={chatbotArea ? `${chatbotArea} m²` : "—"}
            />
            <InfoCard label="Fenster" value={chatbotWindows ?? "—"} />
            <InfoCard label="Kontakt" value={chatbotContact} />
            <InfoCard label="AI-Spanne" value={chatbotPriceRange} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Etage" value={chatbotFloor ?? "—"} />
            <InfoCard label="Lift" value={yesNoLabel(chatbotElevator)} />
            <InfoCard label="Backofen" value={yesNoLabel(chatbotOven)} />
            <InfoCard label="Balkon/Terrasse" value={yesNoLabel(chatbotBalcony)} />
            <InfoCard label="Rhythmus" value={chatbotFrequency ?? "—"} />
            <InfoCard label="Wunschtermin" value={chatbotDate ?? "—"} />
            <InfoCard label="Seite" value={chatbotPageUrl ?? "—"} />
            <InfoCard label="Beschreibung" value={chatbotDescription ?? "—"} />
          </div>
        </section>
      ) : null}

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Status" value={statusLabel(order.status)} />
        <StatCard
          label="Kunde"
          value={customerName(customer)}
          href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
        />
        <StatCard
          label="Angebote"
          value={estimates.length}
          href={
            latestEstimate?.id
              ? `/dashboard/estimates/${latestEstimate.id}`
              : `/dashboard/estimates?orderId=${order.id}`
          }
        />
        <StatCard
          label="Rechnungen"
          value={invoices.length}
          href={`/dashboard/invoices?orderId=${order.id}`}
        />
        <StatCard
          label="Zahlungen"
          value={formatMoney(totalPaid, currency)}
          href={`/dashboard/payments?orderId=${order.id}`}
        />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Section title="Auftragsdaten">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="ID" value={order.id} />
            <InfoCard label="Nummer" value={order.orderNumber ?? order.number} />
            <InfoCard label="Status" value={statusLabel(order.status)} />
            <InfoCard label="Leistungstyp" value={order.serviceType ?? order.type} />

            <InfoCard label="Titel" value={order.title} />
            <InfoCard label="Währung" value={currency} />
            <InfoCard
              label="Geschätzter Preis"
              value={formatMoney(order.estimatedPrice, currency)}
            />
            <InfoCard
              label="Endpreis"
              value={formatMoney(order.finalPrice, currency)}
            />

            <InfoCard label="Start" value={order.scheduledStart} />
            <InfoCard label="Ende" value={order.scheduledEnd} />
            <InfoCard label="Erstellt am" value={order.createdAt} />
            <InfoCard label="Aktualisiert am" value={order.updatedAt} />

            <InfoCard label="Straße / Dienstadresse" value={order.serviceStreet} />
            <InfoCard label="PLZ" value={order.serviceZipCode} />
            <InfoCard label="Ort" value={order.serviceCity} />
            <InfoCard label="Land" value={order.serviceCountry} />

            <InfoCard label="Beschreibung" value={order.description} wide />
            <InfoCard label="Notizen" value={order.notes} wide />
          </div>
        </Section>

        <div className="grid gap-6">
          <Section title="Kunde">
            {customer ? (
              <div className="grid gap-4">
                <InfoCard label="Name" value={customerName(customer)} />
                <InfoCard label="Email" value={customer.email} />
                <InfoCard label="Telefon" value={customer.phone} />
                <InfoCard
                  label="Adresse"
                  value={[
                    customer.street,
                    customer.zipCode,
                    customer.city,
                    customer.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />

                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                >
                  Kundenkarte öffnen
                </Link>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Kein zugehöriger Kunde vorhanden.
              </p>
            )}
          </Section>

          <Section title="Finanzübersicht">
            <div className="grid gap-4">
              <InfoCard
                label="Rechnungsbetrag"
                value={formatMoney(totalInvoices, currency)}
              />
              <InfoCard
                label="Zahlungsbetrag"
                value={formatMoney(totalPaid, currency)}
              />
              <InfoCard
                label="Offen"
                value={formatMoney(totalInvoices - totalPaid, currency)}
              />
            </div>
          </Section>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-2">
        <Section title="Sitzung / Gespräch">
          {session ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="Sitzungs-ID" value={session.id} />
              <InfoCard label="Status" value={session.status} />
              <InfoCard label="Kanal" value={session.channel} />
              <InfoCard label="Quelle" value={session.source} />
              <InfoCard label="Erstellt am" value={session.createdAt} />
              <InfoCard label="Beendet am" value={session.endedAt} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Keine verknüpfte Sitzung.</p>
          )}
        </Section>

        <ReviewChecklist leadType={reviewLeadType} />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-2">
        <Section title="Kundennachricht / Formular / Chat">
          {conversationMessages.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Keine gespeicherten Nachrichten.
            </p>
          ) : (
            <div className="max-h-[480px] space-y-4 overflow-auto pr-2">
              {conversationMessages.map((message) => (
                <div
                  key={String(message.id ?? JSON.stringify(message))}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                      {formatValue(message.role ?? message.sender ?? message.type)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatValue(message.createdAt)}
                    </p>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                    {formatValue(
                      message.content ??
                        message.message ??
                        message.text ??
                        message.body,
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Weitere Bereiche">
          <nav
            data-testid="order-secondary-navigation"
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
          >
            <Link
              href={`/dashboard/orders/${order.id}/edit`}
              className="text-neutral-400 transition hover:text-cyan-300"
            >
              Auftrag bearbeiten
            </Link>

            {customer?.id ? (
              <Link
                href={`/dashboard/customers/${customer.id}`}
                className="text-neutral-400 transition hover:text-cyan-300"
              >
                Kunde
              </Link>
            ) : null}

            {latestEstimate?.id ? (
              <Link
                href={`/dashboard/estimates/${latestEstimate.id}`}
                className="text-neutral-400 transition hover:text-cyan-300"
              >
                Kalkulation
              </Link>
            ) : null}

            <Link
              href={`/dashboard/invoices?orderId=${order.id}`}
              className="text-neutral-400 transition hover:text-cyan-300"
            >
              Rechnungen
            </Link>

            <Link
              href={`/dashboard/payments?orderId=${order.id}`}
              className="text-neutral-400 transition hover:text-cyan-300"
            >
              Zahlungen
            </Link>
          </nav>
        </Section>
      </section>

      <div className="grid gap-6">
        <MiniTable
          title="Angebote"
          items={estimates}
          basePath="/dashboard/estimates"
          columns={[
            {
              label: "Nummer",
              value: (item) => item.estimateNumber ?? item.number ?? item.id,
            },
            {
              label: "Quelle",
              value: (item) => item.source ?? "—",
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Betrag",
              value: (item) =>
                item.total ?? item.totalAmount ?? item.amount ?? item.aiMinTotal,
              money: true,
            },
            {
              label: "Erstellt",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Rechnungen"
          items={invoices}
          basePath="/dashboard/invoices"
          columns={[
            {
              label: "Nummer",
              value: (item) => item.invoiceNumber ?? item.number ?? item.id,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Gesamt",
              value: (item) => item.totalAmount ?? item.total ?? item.amount,
              money: true,
            },
            {
              label: "Bezahlt",
              value: (item) => item.paidAmount,
              money: true,
            },
            {
              label: "Fällig am",
              value: (item) => item.dueDate,
            },
          ]}
        />

        <MiniTable
          title="Zahlungen"
          items={payments}
          basePath="/dashboard/payments"
          columns={[
            {
              label: "Referenz",
              value: (item) =>
                item.paymentReference ??
                item.externalRef ??
                item.reference ??
                item.id,
            },
            {
              label: "Methode",
              value: (item) => item.method ?? item.paymentMethod,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Betrag",
              value: (item) => item.amount ?? item.paidAmount,
              money: true,
            },
            {
              label: "Datum",
              value: (item) => item.paidAt ?? item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Gesprächsnachrichten"
          items={conversationMessages}
          columns={[
            {
              label: "Rolle",
              value: (item) => item.role ?? item.sender ?? item.type,
            },
            {
              label: "Inhalt",
              value: (item) =>
                item.content ?? item.message ?? item.text ?? item.body,
            },
            {
              label: "Erstellt",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Benachrichtigungen"
          items={notifications}
          basePath="/dashboard/notifications"
          columns={[
            {
              label: "Kanal",
              value: (item) => item.channel ?? item.type,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Betreff",
              value: (item) => item.subject ?? item.title ?? item.message,
            },
            {
              label: "Erstellt",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Anhänge"
          items={attachments}
          basePath="/dashboard/attachments"
          columns={[
            {
              label: "Datei",
              value: (item) => item.fileName ?? item.name ?? item.id,
            },
            {
              label: "Typ",
              value: (item) => item.mimeType ?? item.type,
            },
            {
              label: "Grösse",
              value: (item) => item.size ?? item.fileSize,
            },
            {
              label: "Erstellt",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Audit-Protokoll"
          items={auditLogs}
          basePath="/dashboard/audit-logs"
          columns={[
            {
              label: "Aktion",
              value: (item) => item.action ?? item.event,
            },
            {
              label: "Benutzer",
              value: (item) => item.userEmail ?? item.userId ?? item.actor,
            },
            {
              label: "Beschreibung",
              value: (item) => item.description ?? item.message,
            },
            {
              label: "Datum",
              value: (item) => item.createdAt,
            },
          ]}
        />
      </div>
    </main>
  );
}