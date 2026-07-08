import Link from "next/link";
import { notFound } from "next/navigation";

import CreateInvoiceFromQuoteButton from "@/components/dashboard/CreateInvoiceFromQuoteButton";
import GeneratePublicOfferLinkButton from "@/components/dashboard/GeneratePublicOfferLinkButton";
import MarkQuoteAsAcceptedButton from "@/components/dashboard/MarkQuoteAsAcceptedButton";
import MarkQuoteAsSentButton from "@/components/dashboard/MarkQuoteAsSentButton";
import { dashboardService } from "@/services/dashboardService";

type RecordItem = Record<string, unknown>;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return value.toLocaleString("de-CH");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatMoney(value: unknown, currency = "CHF") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(String(value));

  if (!Number.isFinite(amount)) {
    return `${String(value)} ${currency}`;
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDateTime(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return formatValue(value);
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFileSize(value: unknown) {
  const size = Number(value);

  if (!Number.isFinite(size) || size <= 0) {
    return "—";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function asRecord(value: unknown): RecordItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as RecordItem;
}

function toRecords(value: unknown): RecordItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RecordItem => {
    return Boolean(item && typeof item === "object" && !Array.isArray(item));
  });
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function readMetadata(item: RecordItem) {
  return asRecord(item.metadata);
}

function isCustomerUploadAttachment(item: RecordItem) {
  const metadata = readMetadata(item);
  const uploadedBy = readString(item.uploadedBy);
  const source = readString(metadata.source);

  return uploadedBy === "customer_public_link" || source === "public_offer_upload";
}

function fileTypeLabel(value: unknown) {
  const type = String(value ?? "").toUpperCase();

  if (type === "PHOTO") {
    return "Foto";
  }

  if (type === "DOCUMENT") {
    return "Dokument";
  }

  if (type === "INVOICE") {
    return "Rechnung";
  }

  if (type === "QUOTE") {
    return "Offerte";
  }

  return "Datei";
}

function quoteStatusLabel(status: unknown) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  switch (normalizedStatus) {
    case "DRAFT":
      return "Entwurf";
    case "SENT":
      return "Beim Kunden";
    case "ACCEPTED":
      return "Akzeptiert";
    case "REJECTED":
      return "Abgelehnt";
    case "EXPIRED":
      return "Abgelaufen";
    default:
      return formatValue(status);
  }
}

function quoteStatusClass(status: unknown) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  if (normalizedStatus === "ACCEPTED") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }

  if (normalizedStatus === "SENT") {
    return "border-sky-400/30 bg-sky-500/10 text-sky-100";
  }

  if (normalizedStatus === "REJECTED" || normalizedStatus === "EXPIRED") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }

  if (normalizedStatus === "DRAFT") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }

  return "border-neutral-600 bg-neutral-800 text-neutral-200";
}

function getCustomerName(customer: RecordItem | null) {
  if (!customer) {
    return "Kein Kunde verknüpft";
  }

  const companyName = readString(customer.companyName);

  if (companyName) {
    return companyName;
  }

  const fullName = [customer.firstName, customer.lastName]
    .map((value) => readString(value))
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    readString(customer.name) ||
    readString(customer.email) ||
    "Kunde ohne Namen"
  );
}

function getNextStep({
  quote,
  firstInvoice,
}: {
  quote: RecordItem;
  firstInvoice: RecordItem | null;
}) {
  const status = String(quote.status ?? "").toUpperCase();

  if (status === "DRAFT") {
    return {
      title: "Offerte freigeben",
      description:
        "Die Offerte ist noch ein Entwurf. Prüfen Sie die Daten und markieren Sie sie danach als gesendet.",
      tone: "amber",
    };
  }

  if (status === "SENT") {
    return {
      title: "Auf Kundenentscheidung warten",
      description:
        "Die Offerte ist beim Kunden. Nutzen Sie den Kundenlink, prüfen Sie Uploads und warten Sie auf Annahme oder Ablehnung.",
      tone: "sky",
    };
  }

  if (status === "ACCEPTED" && !firstInvoice) {
    return {
      title: "Rechnung erstellen",
      description:
        "Die Offerte wurde akzeptiert. Der nächste sinnvolle Schritt ist die Rechnung.",
      tone: "emerald",
    };
  }

  if (status === "ACCEPTED" && firstInvoice) {
    return {
      title: "Rechnung verfolgen",
      description:
        "Für diese Offerte gibt es bereits eine Rechnung. Prüfen Sie Rechnung und Zahlungseingang.",
      tone: "emerald",
    };
  }

  if (status === "REJECTED") {
    return {
      title: "Keine Aktion erforderlich",
      description:
        "Die Offerte wurde abgelehnt. Bei Bedarf kann später eine neue Offerte erstellt werden.",
      tone: "red",
    };
  }

  if (status === "EXPIRED") {
    return {
      title: "Offerte abgelaufen",
      description:
        "Diese Offerte ist nicht mehr gültig. Bei Bedarf neue Offerte vorbereiten.",
      tone: "red",
    };
  }

  return {
    title: "Status prüfen",
    description: "Prüfen Sie den aktuellen Angebotsstatus und die nächste Aktion.",
    tone: "neutral",
  };
}

function WorkflowCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: unknown;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-bold text-white">
        {formatValue(value)}
      </p>
      {helper ? (
        <p className="mt-2 text-xs leading-5 text-neutral-500">{helper}</p>
      ) : null}
    </div>
  );
}

function CustomerUploadsSection({
  attachments,
}: {
  attachments: RecordItem[];
}) {
  const customerUploads = attachments
    .filter(isCustomerUploadAttachment)
    .sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();

      return bTime - aTime;
    });

  return (
    <section className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
            Kunden-Uploads
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Fotos und Dateien vom Kunden
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Hier sehen Sie nur die Unterlagen, die der Kunde über den
            geschützten Angebotslink hochgeladen hat.
          </p>
        </div>

        <span className="w-fit rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-100">
          {customerUploads.length} Uploads
        </span>
      </div>

      {customerUploads.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-neutral-950/40 p-5">
          <p className="text-sm font-semibold text-neutral-200">
            Noch keine Kunden-Uploads.
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Wenn der Kunde Fotos oder PDF-Dateien hochlädt, erscheinen sie hier.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {customerUploads.map((attachment) => {
            const metadata = readMetadata(attachment);
            const attachmentId = attachment.id ? String(attachment.id) : "";
            const note = readString(metadata.note);

            return (
              <article
                key={attachmentId || JSON.stringify(attachment)}
                className="rounded-2xl border border-white/10 bg-neutral-950/40 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-base font-bold text-white">
                      {formatValue(attachment.fileName)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      {fileTypeLabel(attachment.type)} ·{" "}
                      {formatValue(attachment.mimeType)} ·{" "}
                      {formatFileSize(attachment.sizeBytes)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      Hochgeladen: {formatDateTime(attachment.createdAt)}
                    </p>
                  </div>

                  {attachmentId ? (
                    <Link
                      href={`/dashboard/attachments/${attachmentId}`}
                      className="w-fit rounded-full border border-sky-500/50 px-3 py-1 text-xs font-medium text-sky-300 transition hover:border-sky-300 hover:bg-sky-500/10"
                    >
                      Datei öffnen
                    </Link>
                  ) : null}
                </div>

                {note ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                      Kundenhinweis
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                      {note}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompactList({
  title,
  items,
  basePath,
  emptyText = "Keine Daten.",
}: {
  title: string;
  items: RecordItem[];
  basePath?: string;
  emptyText?: string;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => {
            const itemId = item.id ? String(item.id) : "";
            const label =
              item.quoteNumber ??
              item.invoiceNumber ??
              item.orderNumber ??
              item.fileName ??
              item.subject ??
              item.action ??
              item.status ??
              itemId;

            return (
              <div
                key={itemId || JSON.stringify(item)}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {formatValue(label)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDateTime(item.createdAt ?? item.sentAt ?? item.paidAt)}
                  </p>
                </div>

                {basePath && itemId ? (
                  <Link
                    href={`${basePath}/${itemId}`}
                    className="w-fit rounded-full border border-cyan-500/50 px-3 py-1 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/10"
                  >
                    Öffnen
                  </Link>
                ) : null}
              </div>
            );
          })}

          {items.length > 5 ? (
            <p className="px-1 pt-2 text-xs text-neutral-600">
              Weitere Einträge sind in der jeweiligen Detailansicht verfügbar.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SystemDetailsSection({
  quote,
  customer,
  order,
  session,
  conversationMessages,
  notifications,
  attachments,
  auditLogs,
}: {
  quote: RecordItem;
  customer: RecordItem | null;
  order: RecordItem | null;
  session: RecordItem | null;
  conversationMessages: RecordItem[];
  notifications: RecordItem[];
  attachments: RecordItem[];
  auditLogs: RecordItem[];
}) {
  return (
    <details className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.22em] text-neutral-500 transition hover:text-neutral-300">
        Systemverlauf und technische Details
      </summary>

      <div className="mt-5 grid gap-6">
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-base font-bold text-white">Technische Übersicht</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WorkflowCard label="Quote ID" value={quote.id} />
            <WorkflowCard label="Customer ID" value={customer?.id} />
            <WorkflowCard label="Order ID" value={order?.id} />
            <WorkflowCard label="Session ID" value={session?.id} />
            <WorkflowCard label="Erstellt" value={formatDateTime(quote.createdAt)} />
            <WorkflowCard
              label="Aktualisiert"
              value={formatDateTime(quote.updatedAt)}
            />
            <WorkflowCard label="Gesendet" value={formatDateTime(quote.sentAt)} />
            <WorkflowCard
              label="Akzeptiert"
              value={formatDateTime(quote.acceptedAt)}
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <CompactList
            title="Gesprächsnachrichten"
            items={conversationMessages}
            emptyText="Keine Gesprächsnachrichten."
          />

          <CompactList
            title="Benachrichtigungen"
            items={notifications}
            basePath="/dashboard/notifications"
            emptyText="Keine Benachrichtigungen."
          />

          <CompactList
            title="Alle Anhänge"
            items={attachments}
            basePath="/dashboard/attachments"
            emptyText="Keine Anhänge."
          />

          <CompactList
            title="Audit Logs"
            items={auditLogs}
            basePath="/dashboard/audit-logs"
            emptyText="Keine Audit Logs."
          />
        </div>
      </div>
    </details>
  );
}

export default async function QuoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getQuoteDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = asRecord(result.details);
  const quote = asRecord(details.quote);
  const customer = Object.keys(asRecord(details.customer)).length
    ? asRecord(details.customer)
    : null;
  const order = Object.keys(asRecord(details.order)).length
    ? asRecord(details.order)
    : null;
  const session = Object.keys(asRecord(details.session)).length
    ? asRecord(details.session)
    : null;

  const conversationMessages = toRecords(details.conversationMessages);
  const invoices = toRecords(details.invoices);
  const payments = toRecords(details.payments);
  const notifications = toRecords(details.notifications);
  const attachments = toRecords(details.attachments);
  const auditLogs = toRecords(details.auditLogs);

  const currency = readString(quote.currency) || "CHF";
  const firstInvoice = invoices[0] ?? null;
  const firstPayment = payments[0] ?? null;
  const customerName = getCustomerName(customer);
  const nextStep = getNextStep({ quote, firstInvoice });

  const status = String(quote.status ?? "").toUpperCase();
  const isDraft = status === "DRAFT";
  const isSent = status === "SENT";
  const isAccepted = status === "ACCEPTED";

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/quotes"
              className="text-sm text-cyan-400 transition hover:text-cyan-300"
            >
              ← Zurück zu Offerten
            </Link>

            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
              HEXA OS / Offerte
            </p>

            <h1 className="mt-3 text-3xl font-black text-white">
              Offerte {formatValue(quote.quoteNumber ?? quote.number)}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
              Klare Arbeitsansicht mit Status, nächstem Schritt, Kunde, Summe,
              Uploads und Rechnung. Technische Details bleiben unten im
              Systemverlauf.
            </p>
          </div>

          <span
            className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${quoteStatusClass(
              quote.status,
            )}`}
          >
            {quoteStatusLabel(quote.status)}
          </span>
        </div>

        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                Nächster Schritt
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                {nextStep.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">
                {nextStep.description}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <WorkflowCard label="Kunde" value={customerName} />
                <WorkflowCard
                  label="Total"
                  value={formatMoney(quote.total, currency)}
                />
                <WorkflowCard
                  label="Gültig bis"
                  value={formatDateTime(quote.validUntil ?? quote.dueDate)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-950/50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
                Hauptaktion
              </p>

              <div className="mt-4 grid gap-3">
                {isDraft ? (
                  <MarkQuoteAsSentButton quoteId={String(quote.id)} />
                ) : null}

                {isSent ? (
                  <>
                    <GeneratePublicOfferLinkButton
                      quoteId={String(quote.id)}
                      quoteStatus={String(quote.status)}
                    />
                    <MarkQuoteAsAcceptedButton quoteId={String(quote.id)} />
                  </>
                ) : null}

                {isAccepted && firstInvoice?.id ? (
                  <Link
                    href={`/dashboard/invoices/${String(firstInvoice.id)}`}
                    className="rounded-xl border border-emerald-600 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-900/70"
                  >
                    Rechnung öffnen
                  </Link>
                ) : null}

                {isAccepted && !firstInvoice ? (
                  <CreateInvoiceFromQuoteButton quoteId={String(quote.id)} />
                ) : null}

                {!isDraft && !isSent && !isAccepted ? (
                  <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-300">
                    Keine Hauptaktion für diesen Status.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
              Kurzüberblick
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Kunde, Auftrag und Betrag
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <WorkflowCard label="Kunde" value={customerName} />
              <WorkflowCard
                label="Kontakt"
                value={customer?.email ?? customer?.phone}
              />
              <WorkflowCard
                label="Auftrag"
                value={order?.orderNumber ?? order?.number ?? "Kein Auftrag"}
              />
              <WorkflowCard
                label="Leistung"
                value={order?.serviceType ?? order?.service}
              />
              <WorkflowCard
                label="Zwischensumme"
                value={formatMoney(quote.subtotal, currency)}
              />
              <WorkflowCard label="Total" value={formatMoney(quote.total, currency)} />
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
              Verknüpfungen
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Direkt öffnen
            </h2>

            <div className="mt-5 grid gap-3">
              {customer?.id ? (
                <Link
                  href={`/dashboard/customers/${String(customer.id)}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                >
                  Kunde öffnen →
                </Link>
              ) : null}

              {order?.id ? (
                <Link
                  href={`/dashboard/orders/${String(order.id)}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                >
                  Auftrag öffnen →
                </Link>
              ) : null}

              {firstInvoice?.id ? (
                <Link
                  href={`/dashboard/invoices/${String(firstInvoice.id)}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/50 hover:bg-emerald-400/10"
                >
                  Rechnung öffnen →
                </Link>
              ) : null}

              {firstPayment?.id ? (
                <Link
                  href={`/dashboard/payments/${String(firstPayment.id)}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/50 hover:bg-emerald-400/10"
                >
                  Zahlung öffnen →
                </Link>
              ) : null}

              {!customer?.id && !order?.id && !firstInvoice?.id && !firstPayment?.id ? (
                <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-500">
                  Keine direkten Verknüpfungen vorhanden.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <CustomerUploadsSection attachments={attachments} />

        <section className="grid gap-6 xl:grid-cols-2">
          <CompactList
            title="Rechnungen"
            items={invoices}
            basePath="/dashboard/invoices"
            emptyText="Noch keine Rechnung für diese Offerte."
          />

          <CompactList
            title="Zahlungen"
            items={payments}
            basePath="/dashboard/payments"
            emptyText="Noch keine Zahlung erfasst."
          />
        </section>

        <SystemDetailsSection
          quote={quote}
          customer={customer}
          order={order}
          session={session}
          conversationMessages={conversationMessages}
          notifications={notifications}
          attachments={attachments}
          auditLogs={auditLogs}
        />
      </div>
    </main>
  );
}