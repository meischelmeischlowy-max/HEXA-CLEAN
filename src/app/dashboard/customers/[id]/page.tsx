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

function getCustomerDisplayName(customer: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const fullName = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return (
    fullName ||
    customer.companyName ||
    customer.name ||
    customer.email ||
    "—"
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

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getCustomerDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const {
    customer,
    sessions,
    conversationMessages,
    orders,
    quotes,
    invoices,
    payments,
    notifications,
    attachments,
    auditLogs,
  } = result.details;

  const customerName = getCustomerDisplayName(customer);

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/customers"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do klientów
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły klienta</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Dane klienta oraz powiązane sesje, zlecenia, oferty, faktury,
            płatności, załączniki i historia systemu.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">Szybka nawigacja CRM</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Pierwsze zlecenie"
            href={orders?.[0]?.id ? `/dashboard/orders/${orders[0].id}` : null}
            value={orders?.[0]?.orderNumber ?? orders?.[0]?.number ?? orders?.[0]?.id}
          />

          <RecordLink
            label="Pierwsza oferta"
            href={quotes?.[0]?.id ? `/dashboard/quotes/${quotes[0].id}` : null}
            value={quotes?.[0]?.quoteNumber ?? quotes?.[0]?.number ?? quotes?.[0]?.id}
          />

          <RecordLink
            label="Pierwsza faktura"
            href={
              invoices?.[0]?.id
                ? `/dashboard/invoices/${invoices[0].id}`
                : null
            }
            value={
              invoices?.[0]?.invoiceNumber ??
              invoices?.[0]?.number ??
              invoices?.[0]?.id
            }
          />

          <RecordLink
            label="Pierwsza płatność"
            href={
              payments?.[0]?.id
                ? `/dashboard/payments/${payments[0].id}`
                : null
            }
            value={
              payments?.[0]?.paymentReference ??
              payments?.[0]?.reference ??
              payments?.[0]?.id
            }
          />
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Klient</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={customer.id} />
          <InfoCard label="Imię / nazwa" value={customerName} />
          <InfoCard label="Email" value={customer.email} />
          <InfoCard label="Telefon" value={customer.phone} />
          <InfoCard label="Utworzono" value={customer.createdAt} />
          <InfoCard label="Aktualizacja" value={customer.updatedAt} />
        </div>
      </section>

      <div className="grid gap-6">
        <DataSection
          title="Sesje"
          items={(sessions ?? []) as Record<string, unknown>[]}
        />

        <DataSection
          title="Wiadomości rozmów"
          items={(conversationMessages ?? []) as Record<string, unknown>[]}
        />

        <DataSection
          title="Zlecenia"
          items={(orders ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/orders"
        />

        <DataSection
          title="Oferty"
          items={(quotes ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/quotes"
        />

        <DataSection
          title="Faktury"
          items={(invoices ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/invoices"
        />

        <DataSection
          title="Płatności"
          items={(payments ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/payments"
        />

        <DataSection
          title="Powiadomienia"
          items={(notifications ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/notifications"
        />

        <DataSection
          title="Załączniki"
          items={(attachments ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/attachments"
        />

        <DataSection
          title="Audit Logi"
          items={(auditLogs ?? []) as Record<string, unknown>[]}
          basePath="/dashboard/audit-logs"
        />
      </div>
    </main>
  );
}