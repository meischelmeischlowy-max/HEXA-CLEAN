import Link from "next/link";
import { notFound } from "next/navigation";

import CreateInvoiceFromQuoteButton from "@/components/dashboard/CreateInvoiceFromQuoteButton";
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
        <p className="text-sm text-neutral-500">Brak danych.</p>
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
                  Numer / Nazwa
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Data
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Akcja
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
                          item.action
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
                          Szczegóły
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
            ← Wróć do ofert
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły oferty</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełne dane oferty oraz powiązany klient, zlecenie, faktury,
            płatności, załączniki i historia systemu.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {isAccepted ? (
            <div className="rounded-xl border border-lime-600 bg-lime-950/50 px-4 py-3 text-sm font-semibold text-lime-100">
              Oferta zaakceptowana
            </div>
          ) : isSent ? (
            <>
              <div className="rounded-xl border border-sky-600 bg-sky-950/50 px-4 py-3 text-sm font-semibold text-sky-100">
                Oferta wysłana
              </div>

              <MarkQuoteAsAcceptedButton quoteId={quote.id} />
            </>
          ) : isDraft ? (
            <MarkQuoteAsSentButton quoteId={quote.id} />
          ) : (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-300">
              Status oferty: {quote.status}
            </div>
          )}

          {firstInvoice?.id ? (
            <Link
              href={`/dashboard/invoices/${firstInvoice.id}`}
              className="rounded-xl border border-emerald-600 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-900/70"
            >
              Otwórz fakturę
            </Link>
          ) : (
            <CreateInvoiceFromQuoteButton quoteId={quote.id} />
          )}
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">Szybka nawigacja CRM</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Klient"
            href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
            value={customerName}
          />

          <RecordLink
            label="Zlecenie"
            href={order?.id ? `/dashboard/orders/${order.id}` : null}
            value={order?.orderNumber ?? order?.number ?? order?.id}
          />

          <RecordLink
            label="Pierwsza faktura"
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
            label="Pierwsza płatność"
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

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Oferta</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={quote.id} />
          <InfoCard label="Numer" value={quote.quoteNumber ?? quote.number} />
          <InfoCard label="Status" value={quote.status} />
          <InfoCard label="Waluta" value={currency} />
          <InfoCard
            label="Subtotal"
            value={formatMoney(quote.subtotal, currency)}
          />
          <InfoCard label="Tax Rate" value={quote.taxRate} />
          <InfoCard
            label="Tax Amount"
            value={formatMoney(quote.taxAmount, currency)}
          />
          <InfoCard label="Total" value={formatMoney(quote.total, currency)} />
          <InfoCard label="Klient ID" value={quote.customerId} />
          <InfoCard label="Zlecenie ID" value={quote.orderId} />
          <InfoCard label="Sesja ID" value={quote.sessionId} />
          <InfoCard label="Ważna do" value={quote.validUntil ?? quote.dueDate} />
          <InfoCard label="Wysłano" value={quote.sentAt} />
          <InfoCard label="Zaakceptowano" value={quote.acceptedAt} />
          <InfoCard label="Utworzono" value={quote.createdAt} />
          <InfoCard label="Aktualizacja" value={quote.updatedAt} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Klient</h2>

          {customer ? (
            <div className="grid gap-4">
              <RecordLink
                label="Otwórz klienta"
                href={`/dashboard/customers/${customer.id}`}
                value={customerName}
              />
              <InfoCard label="ID" value={customer.id} />
              <InfoCard label="Imię / nazwa" value={customerName} />
              <InfoCard label="Email" value={customer.email} />
              <InfoCard label="Telefon" value={customer.phone} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Brak powiązanego klienta.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Zlecenie</h2>

          {order ? (
            <div className="grid gap-4">
              <RecordLink
                label="Otwórz zlecenie"
                href={`/dashboard/orders/${order.id}`}
                value={order.orderNumber ?? order.number ?? order.id}
              />
              <InfoCard label="ID" value={order.id} />
              <InfoCard
                label="Numer"
                value={order.orderNumber ?? order.number}
              />
              <InfoCard label="Status" value={order.status} />
              <InfoCard
                label="Usługa"
                value={order.serviceType ?? order.service}
              />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Brak powiązanego zlecenia.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Sesja</h2>

          {session ? (
            <div className="grid gap-4">
              <InfoCard label="ID" value={session.id} />
              <InfoCard label="Status" value={session.status} />
              <InfoCard label="Utworzono" value={session.createdAt} />
              <InfoCard label="Zakończono" value={session.endedAt} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Brak powiązanej sesji.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6">
        <DataSection
          title="Wiadomości rozmów"
          items={conversationMessages as Record<string, unknown>[]}
        />

        <DataSection
          title="Faktury"
          items={invoices as Record<string, unknown>[]}
          basePath="/dashboard/invoices"
        />

        <DataSection
          title="Płatności"
          items={payments as Record<string, unknown>[]}
          basePath="/dashboard/payments"
        />

        <DataSection
          title="Powiadomienia"
          items={notifications as Record<string, unknown>[]}
          basePath="/dashboard/notifications"
        />

        <DataSection
          title="Załączniki"
          items={attachments as Record<string, unknown>[]}
          basePath="/dashboard/attachments"
        />

        <DataSection
          title="Audit Logi"
          items={auditLogs as Record<string, unknown>[]}
          basePath="/dashboard/audit-logs"
        />
      </div>
    </main>
  );
}