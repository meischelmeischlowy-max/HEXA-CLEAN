import Link from "next/link";
import { notFound } from "next/navigation";

import CreatePaymentFromInvoiceButton from "@/components/dashboard/CreatePaymentFromInvoiceButton";
import MarkInvoiceAsSentButton from "@/components/dashboard/MarkInvoiceAsSentButton";
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

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getInvoiceDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = result.details;

  const invoice = details.invoice;
  const customer = details.customer;
  const order = details.order;
  const quote = details.quote;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const payments = details.payments ?? [];
  const notifications = details.notifications ?? [];
  const attachments = details.attachments ?? [];
  const auditLogs = details.auditLogs ?? [];

  const currency = invoice.currency ?? "CHF";
  const firstPayment = payments[0] ?? null;

  const isDraft = invoice.status === "DRAFT";
  const isSent = invoice.status === "SENT";
  const isPaid = invoice.status === "PAID";

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/invoices"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do faktur
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły faktury</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełne dane faktury oraz powiązany klient, zlecenie, oferta,
            płatności, załączniki i historia systemu.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {isPaid ? (
            <div className="rounded-xl border border-green-600 bg-green-950/50 px-4 py-3 text-sm font-semibold text-green-100">
              Faktura opłacona
            </div>
          ) : isSent ? (
            <div className="rounded-xl border border-sky-600 bg-sky-950/50 px-4 py-3 text-sm font-semibold text-sky-100">
              Faktura wysłana
            </div>
          ) : isDraft ? (
            <MarkInvoiceAsSentButton invoiceId={invoice.id} />
          ) : (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3 text-sm font-semibold text-neutral-300">
              Status faktury: {invoice.status}
            </div>
          )}

          {firstPayment?.id ? (
            <Link
              href={`/dashboard/payments/${firstPayment.id}`}
              className="rounded-xl border border-violet-600 bg-violet-950/50 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:border-violet-300 hover:bg-violet-900/70"
            >
              Otwórz płatność
            </Link>
          ) : (
            <CreatePaymentFromInvoiceButton invoiceId={invoice.id} />
          )}
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">Szybka nawigacja CRM</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Klient"
            href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
            value={
              customer?.companyName ??
              customer?.name ??
              customer?.email ??
              customer?.id
            }
          />

          <RecordLink
            label="Zlecenie"
            href={order?.id ? `/dashboard/orders/${order.id}` : null}
            value={order?.orderNumber ?? order?.number ?? order?.id}
          />

          <RecordLink
            label="Oferta"
            href={quote?.id ? `/dashboard/quotes/${quote.id}` : null}
            value={quote?.quoteNumber ?? quote?.number ?? quote?.id}
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
        <h2 className="mb-4 text-xl font-bold">Faktura</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={invoice.id} />
          <InfoCard
            label="Numer"
            value={invoice.invoiceNumber ?? invoice.number}
          />
          <InfoCard label="Status" value={invoice.status} />
          <InfoCard label="Waluta" value={currency} />
          <InfoCard
            label="Subtotal"
            value={formatMoney(invoice.subtotal, currency)}
          />
          <InfoCard label="Tax Rate" value={invoice.taxRate} />
          <InfoCard
            label="Tax Amount"
            value={formatMoney(invoice.taxAmount, currency)}
          />
          <InfoCard label="Total" value={formatMoney(invoice.total, currency)} />
          <InfoCard
            label="Zapłacono"
            value={formatMoney(invoice.paidAmount, currency)}
          />
          <InfoCard label="Data wystawienia" value={invoice.issueDate} />
          <InfoCard label="Termin płatności" value={invoice.dueDate} />
          <InfoCard label="Wysłano" value={invoice.sentAt} />
          <InfoCard label="Opłacono" value={invoice.paidAt} />
          <InfoCard label="Klient ID" value={invoice.customerId} />
          <InfoCard label="Zlecenie ID" value={invoice.orderId} />
          <InfoCard label="Oferta ID" value={invoice.quoteId} />
          <InfoCard label="Utworzono" value={invoice.createdAt} />
          <InfoCard label="Aktualizacja" value={invoice.updatedAt} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Klient</h2>

          {customer ? (
            <div className="grid gap-4">
              <RecordLink
                label="Otwórz klienta"
                href={`/dashboard/customers/${customer.id}`}
                value={
                  customer.companyName ??
                  `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ??
                  customer.email ??
                  customer.id
                }
              />
              <InfoCard label="ID" value={customer.id} />
              <InfoCard
                label="Imię / nazwa"
                value={
                  customer.companyName ??
                  `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
                }
              />
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
          <h2 className="mb-4 text-xl font-bold">Oferta</h2>

          {quote ? (
            <div className="grid gap-4">
              <RecordLink
                label="Otwórz ofertę"
                href={`/dashboard/quotes/${quote.id}`}
                value={quote.quoteNumber ?? quote.number ?? quote.id}
              />
              <InfoCard label="ID" value={quote.id} />
              <InfoCard
                label="Numer"
                value={quote.quoteNumber ?? quote.number}
              />
              <InfoCard label="Status" value={quote.status} />
              <InfoCard
                label="Total"
                value={formatMoney(quote.total, currency)}
              />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Brak powiązanej oferty.</p>
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