import Link from "next/link";
import { notFound } from "next/navigation";

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

function formatFileSize(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const size = Number(value);

  if (Number.isNaN(size)) {
    return String(value);
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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
                  Treść / Akcja
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
                      {formatValue(item.status ?? item.type ?? item.role)}
                    </td>

                    <td className="max-w-[420px] truncate px-3 py-3 text-white">
                      {formatValue(
                        item.content ??
                          item.message ??
                          item.body ??
                          item.subject ??
                          item.action ??
                          item.fileName
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

export default async function AttachmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getAttachmentDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = result.details;

  const attachment = details.attachment;
  const invoice = details.invoice;
  const customer = details.customer;
  const order = details.order;
  const quote = details.quote;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const notifications = details.notifications ?? [];
  const auditLogs = details.auditLogs ?? [];

  const fileUrl =
    attachment.url ??
    attachment.fileUrl ??
    attachment.storageUrl ??
    attachment.publicUrl ??
    null;

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/attachments"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do załączników
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły załącznika</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełne dane pliku oraz powiązany klient, zlecenie, oferta, faktura,
            sesja, wiadomości i historia systemu.
          </p>
        </div>

        {fileUrl && (
          <a
            href={String(fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-cyan-700 bg-cyan-950/40 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
          >
            Otwórz plik
          </a>
        )}
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">Szybka nawigacja CRM</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Klient"
            href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
            value={customer?.name ?? customer?.email ?? customer?.id}
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
            label="Faktura"
            href={invoice?.id ? `/dashboard/invoices/${invoice.id}` : null}
            value={invoice?.invoiceNumber ?? invoice?.number ?? invoice?.id}
          />
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Załącznik</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={attachment.id} />
          <InfoCard
            label="Nazwa pliku"
            value={attachment.fileName ?? attachment.name}
          />
          <InfoCard
            label="Typ pliku"
            value={attachment.mimeType ?? attachment.fileType ?? attachment.type}
          />
          <InfoCard
            label="Rozmiar"
            value={formatFileSize(attachment.size ?? attachment.sizeBytes)}
          />
          <InfoCard label="URL" value={fileUrl} />
          <InfoCard label="Klient ID" value={attachment.customerId} />
          <InfoCard label="Zlecenie ID" value={attachment.orderId} />
          <InfoCard label="Oferta ID" value={attachment.quoteId} />
          <InfoCard label="Faktura ID" value={attachment.invoiceId} />
          <InfoCard label="Sesja ID" value={attachment.sessionId} />
          <InfoCard label="Utworzono" value={attachment.createdAt} />
          <InfoCard label="Aktualizacja" value={attachment.updatedAt} />
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
                value={customer.name ?? customer.email ?? customer.id}
              />
              <InfoCard label="ID" value={customer.id} />
              <InfoCard label="Imię / nazwa" value={customer.name} />
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
          <h2 className="mb-4 text-xl font-bold">Oferta / Faktura</h2>

          <div className="grid gap-4">
            {quote ? (
              <>
                <RecordLink
                  label="Otwórz ofertę"
                  href={`/dashboard/quotes/${quote.id}`}
                  value={quote.quoteNumber ?? quote.number ?? quote.id}
                />
                <InfoCard label="Oferta ID" value={quote.id} />
                <InfoCard
                  label="Oferta numer"
                  value={quote.quoteNumber ?? quote.number}
                />
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                Brak powiązanej oferty.
              </p>
            )}

            {invoice ? (
              <>
                <RecordLink
                  label="Otwórz fakturę"
                  href={`/dashboard/invoices/${invoice.id}`}
                  value={invoice.invoiceNumber ?? invoice.number ?? invoice.id}
                />
                <InfoCard label="Faktura ID" value={invoice.id} />
                <InfoCard
                  label="Faktura numer"
                  value={invoice.invoiceNumber ?? invoice.number}
                />
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                Brak powiązanej faktury.
              </p>
            )}
          </div>
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
          title="Powiadomienia"
          items={notifications as Record<string, unknown>[]}
          basePath="/dashboard/notifications"
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