import Link from "next/link";
import { notFound } from "next/navigation";

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
}: {
  title: string;
  items: Record<string, unknown>[];
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
          <table className="w-full min-w-[700px] text-left text-sm">
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
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={String(item.id)}
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
                        item.fileName ??
                        item.subject ??
                        item.action
                    )}
                  </td>

                  <td className="px-3 py-3 text-neutral-400">
                    {formatValue(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getPaymentDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = result.details;

  const payment = details.payment;
  const invoice = details.invoice;
  const customer = details.customer;
  const order = details.order;
  const quote = details.quote;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const notifications = details.notifications ?? [];
  const attachments = details.attachments ?? [];
  const auditLogs = details.auditLogs ?? [];

  const currency = payment.currency ?? invoice?.currency ?? "CHF";

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/payments"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do płatności
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły płatności</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełne dane płatności oraz powiązana faktura, klient, zlecenie,
            oferta, załączniki i historia systemu.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Płatność</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={payment.id} />
          <InfoCard label="Status" value={payment.status} />
          <InfoCard label="Kwota" value={formatMoney(payment.amount, currency)} />
          <InfoCard label="Waluta" value={currency} />
          <InfoCard label="Faktura ID" value={payment.invoiceId} />
          <InfoCard label="Metoda" value={payment.method} />
          <InfoCard label="Provider" value={payment.provider} />
          <InfoCard label="Transaction ID" value={payment.transactionId} />
          <InfoCard label="Utworzono" value={payment.createdAt} />
          <InfoCard label="Aktualizacja" value={payment.updatedAt} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Faktura</h2>

          {invoice ? (
            <div className="grid gap-4">
              <InfoCard label="ID" value={invoice.id} />
              <InfoCard
                label="Numer"
                value={invoice.invoiceNumber ?? invoice.number}
              />
              <InfoCard label="Status" value={invoice.status} />
              <InfoCard label="Total" value={formatMoney(invoice.total, currency)} />
              <InfoCard
                label="Zapłacono"
                value={formatMoney(invoice.paidAmount, currency)}
              />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Brak powiązanej faktury.
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="mb-4 text-xl font-bold">Klient</h2>

          {customer ? (
            <div className="grid gap-4">
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
          <h2 className="mb-4 text-xl font-bold">Zlecenie / Oferta</h2>

          <div className="grid gap-4">
            {order ? (
              <>
                <InfoCard label="Zlecenie ID" value={order.id} />
                <InfoCard
                  label="Zlecenie numer"
                  value={order.orderNumber ?? order.number}
                />
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                Brak powiązanego zlecenia.
              </p>
            )}

            {quote ? (
              <>
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
        />

        <DataSection
          title="Załączniki"
          items={attachments as Record<string, unknown>[]}
        />

        <DataSection
          title="Audit Logi"
          items={auditLogs as Record<string, unknown>[]}
        />
      </div>
    </main>
  );
}