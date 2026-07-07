import Link from "next/link";
import { notFound } from "next/navigation";

import CreateInvoiceFromQuoteButton from "@/components/dashboard/CreateInvoiceFromQuoteButton";
import GeneratePublicOfferLinkButton from "@/components/dashboard/GeneratePublicOfferLinkButton";
import MarkQuoteAsAcceptedButton from "@/components/dashboard/MarkQuoteAsAcceptedButton";
import MarkQuoteAsSentButton from "@/components/dashboard/MarkQuoteAsSentButton";
import RecordLink from "@/components/dashboard/RecordLink";
import { dashboardService } from "@/services/dashboardService";

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

  return `${String(value)} ${currency}`;
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

function notificationStatusClass(status: unknown) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  if (normalizedStatus === "SENT" || normalizedStatus === "READ") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }

  if (normalizedStatus === "FAILED") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }

  if (normalizedStatus === "PENDING") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }

  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function InfoCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {formatValue(value)}
      </p>
    </div>
  );
}

function CommunicationSection({
  notifications,
}: {
  notifications: Record<string, unknown>[];
}) {
  const emailNotifications = [...notifications]
    .filter((notification) => {
      const channel = String(notification.channel ?? "").toUpperCase();

      return channel === "EMAIL";
    })
    .sort((a, b) => {
      const aTime = new Date(String(a.createdAt ?? 0)).getTime();
      const bTime = new Date(String(b.createdAt ?? 0)).getTime();

      return bTime - aTime;
    });

  const latestEmailNotification = emailNotifications[0] ?? null;

  return (
    <section className="mb-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
            Kommunikation
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Offertenversand / Notification Log
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Hier sieht man, ob für diese Offerte eine E-Mail-Kommunikation
            vorbereitet wurde. Der vollständige Public-Link-Token wird aus
            Sicherheitsgründen nicht dauerhaft gespeichert.
          </p>
        </div>

        <span className="w-fit rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-100">
          E-Mail-Logs: {emailNotifications.length}
        </span>
      </div>

      {!latestEmailNotification ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-5">
          <p className="text-sm font-semibold text-neutral-200">
            Noch keine E-Mail Notification vorbereitet.
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Sobald ein Kundenlink erstellt wird und der Kunde eine
            E-Mail-Adresse hat, legt das System automatisch eine Notification
            mit Status PENDING an.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  {formatValue(latestEmailNotification.subject)}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Empfänger:{" "}
                  <span className="font-semibold text-neutral-300">
                    {formatValue(latestEmailNotification.recipient)}
                  </span>
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${notificationStatusClass(
                  latestEmailNotification.status,
                )}`}
              >
                {formatValue(latestEmailNotification.status)}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">
                Nachricht / gespeicherter Log
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                {formatValue(latestEmailNotification.message)}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <InfoCard
              label="Notification ID"
              value={latestEmailNotification.id}
            />
            <InfoCard label="Kanal" value={latestEmailNotification.channel} />
            <InfoCard label="Status" value={latestEmailNotification.status} />
            <InfoCard
              label="Erstellt"
              value={formatDateTime(latestEmailNotification.createdAt)}
            />
            <InfoCard
              label="Gesendet"
              value={formatDateTime(latestEmailNotification.sentAt)}
            />
            <InfoCard
              label="Gelesen"
              value={formatDateTime(latestEmailNotification.readAt)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function DataSection({
  title,
  items,
  basePath,
}: {
  title: string;
  items: Record<string, unknown>[];
  basePath?: string;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>

        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Keine Daten.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <tr>
                <th className="border-b border-neutral-800 px-3 py-3">ID</th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Status / Typ
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Nummer / Name
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Datum
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Aktion
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const itemId = item.id ? String(item.id) : "";

                return (
                  <tr
                    key={itemId || JSON.stringify(item)}
                    className="border-b border-neutral-800"
                  >
                    <td className="max-w-[220px] truncate px-3 py-3 text-neutral-400">
                      {formatValue(item.id)}
                    </td>

                    <td className="px-3 py-3 text-neutral-300">
                      {formatValue(item.status ?? item.type ?? item.channel)}
                    </td>

                    <td className="px-3 py-3 text-white">
                      {formatValue(
                        item.number ??
                          item.orderNumber ??
                          item.quoteNumber ??
                          item.invoiceNumber ??
                          item.paymentReference ??
                          item.externalRef ??
                          item.reference ??
                          item.fileName ??
                          item.subject ??
                          item.action,
                      )}
                    </td>

                    <td className="px-3 py-3 text-neutral-400">
                      {formatValue(item.createdAt)}
                    </td>

                    <td className="px-3 py-3">
                      {basePath && itemId ? (
                        <Link
                          href={`${basePath}/${itemId}`}
                          className="rounded-full border border-cyan-500/50 px-3 py-1 text-xs font-medium text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-500/10"
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
    </section>
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

  const details = result.details;

  const quote = details.quote;
  const customer = details.customer;
  const order = details.order;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const invoices = details.invoices ?? [];
  const payments = details.payments ?? [];
  const notifications = details.notifications ?? [];
  const attachments = details.attachments ?? [];
  const auditLogs = details.auditLogs ?? [];

  const currency = quote.currency ?? "CHF";
  const firstInvoice = invoices[0] ?? null;
  const firstPayment = payments[0] ?? null;

  const isDraft = quote.status === "DRAFT";
  const isSent = quote.status === "SENT";
  const isAccepted = quote.status === "ACCEPTED";

  const customerName =
    customer?.companyName ??
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ??
    customer?.name ??
    customer?.email ??
    customer?.id;

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/quotes"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Zurück zu Angeboten
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Angebotsdetails</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Vollständige Angebotsdaten inklusive zugehörigem Kunden, Auftrag,
            Rechnungen, Zahlungen, Anhängen und Systemverlauf.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-[420px] lg:items-stretch">
          {isAccepted ? (
            <div className="rounded-xl border border-lime-600 bg-lime-950/50 px-4 py-3 text-sm font-semibold text-lime-100">
              Angebot akzeptiert
            </div>
          ) : isSent ? (
            <>
              <div className="rounded-xl border border-sky-600 bg-sky-950/50 px-4 py-3 text-sm font-semibold text-sky-100">
                Angebot versendet
              </div>

              <MarkQuoteAsAcceptedButton quoteId={quote.id} />
            </>
          ) : isDraft ? (
            <MarkQuoteAsSentButton quoteId={quote.id} />
          ) : (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-300">
              Angebotsstatus: {quote.status}
            </div>
          )}

          <GeneratePublicOfferLinkButton
            quoteId={quote.id}
            quoteStatus={quote.status}
          />

          {firstInvoice?.id ? (
            <Link
              href={`/dashboard/invoices/${firstInvoice.id}`}
              className="rounded-xl border border-emerald-600 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-900/70"
            >
              Rechnung öffnen
            </Link>
          ) : (
            <CreateInvoiceFromQuoteButton quoteId={quote.id} />
          )}
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">CRM-Schnellnavigation</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Kunde"
            href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
            value={customerName}
          />

          <RecordLink
            label="Auftrag"
            href={order?.id ? `/dashboard/orders/${order.id}` : null}
            value={order?.orderNumber ?? order?.number ?? order?.id}
          />

          <RecordLink
            label="Erste Rechnung"
            href={
              firstInvoice?.id
                ? `/dashboard/invoices/${firstInvoice.id}`
                : null
            }
            value={
              firstInvoice?.invoiceNumber ??
              firstInvoice?.number ??
              firstInvoice?.id
            }
          />

          <RecordLink
            label="Erste Zahlung"
            href={
              firstPayment?.id
                ? `/dashboard/payments/${firstPayment.id}`
                : null
            }
            value={
              firstPayment?.paymentReference ??
              firstPayment?.externalRef ??
              firstPayment?.reference ??
              firstPayment?.id
            }
          />
        </div>
      </section>

      <CommunicationSection
        notifications={notifications as Record<string, unknown>[]}
      />

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Angebot</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={quote.id} />
          <InfoCard label="Nummer" value={quote.quoteNumber ?? quote.number} />
          <InfoCard label="Status" value={quote.status} />
          <InfoCard label="Währung" value={currency} />
          <InfoCard
            label="Subtotal"
            value={formatMoney(quote.subtotal, currency)}
          />
          <InfoCard label="Steuersatz" value={quote.taxRate} />
          <InfoCard
            label="Steuerbetrag"
            value={formatMoney(quote.taxAmount, currency)}
          />
          <InfoCard label="Total" value={formatMoney(quote.total, currency)} />
          <InfoCard label="Kunden-ID" value={quote.customerId} />
          <InfoCard label="Auftrag-ID" value={quote.orderId} />
          <InfoCard label="Sitzungs-ID" value={quote.sessionId} />
          <InfoCard
            label="Gültig bis"
            value={quote.validUntil ?? quote.dueDate}
          />
          <InfoCard label="Gesendet" value={quote.sentAt} />
          <InfoCard label="Akzeptiert" value={quote.acceptedAt} />
          <InfoCard label="Erstellt" value={quote.createdAt} />
          <InfoCard label="Aktualisiert" value={quote.updatedAt} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Kunde</h2>

          {customer ? (
            <div className="grid gap-4">
              <RecordLink
                label="Kunde öffnen"
                href={`/dashboard/customers/${customer.id}`}
                value={customerName}
              />
              <InfoCard label="ID" value={customer.id} />
              <InfoCard label="Name" value={customerName} />
              <InfoCard label="E-Mail" value={customer.email} />
              <InfoCard label="Telefon" value={customer.phone} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Kein verknüpfter Kunde.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Auftrag</h2>

          {order ? (
            <div className="grid gap-4">
              <RecordLink
                label="Auftrag öffnen"
                href={`/dashboard/orders/${order.id}`}
                value={order.orderNumber ?? order.number ?? order.id}
              />
              <InfoCard label="ID" value={order.id} />
              <InfoCard
                label="Nummer"
                value={order.orderNumber ?? order.number}
              />
              <InfoCard label="Status" value={order.status} />
              <InfoCard
                label="Leistung"
                value={order.serviceType ?? order.service}
              />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Kein verknüpfter Auftrag.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Sitzung</h2>

          {session ? (
            <div className="grid gap-4">
              <InfoCard label="ID" value={session.id} />
              <InfoCard label="Status" value={session.status} />
              <InfoCard label="Erstellt" value={session.createdAt} />
              <InfoCard label="Beendet" value={session.endedAt} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Keine verknüpfte Sitzung.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6">
        <DataSection
          title="Gesprächsnachrichten"
          items={conversationMessages as Record<string, unknown>[]}
        />

        <DataSection
          title="Rechnungen"
          items={invoices as Record<string, unknown>[]}
          basePath="/dashboard/invoices"
        />

        <DataSection
          title="Zahlungen"
          items={payments as Record<string, unknown>[]}
          basePath="/dashboard/payments"
        />

        <DataSection
          title="Benachrichtigungen"
          items={notifications as Record<string, unknown>[]}
          basePath="/dashboard/notifications"
        />

        <DataSection
          title="Anhänge"
          items={attachments as Record<string, unknown>[]}
          basePath="/dashboard/attachments"
        />

        <DataSection
          title="Audit Logs"
          items={auditLogs as Record<string, unknown>[]}
          basePath="/dashboard/audit-logs"
        />
      </div>
    </main>
  );
}