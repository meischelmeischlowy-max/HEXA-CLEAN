import Link from "next/link";
import { notFound } from "next/navigation";

import { dashboardService } from "@/services/dashboardService";

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (value instanceof Date) {
    return value.toLocaleString("de-CH");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
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
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}) {
  const fullName = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return fullName || customer.companyName || "-";
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
                <tr key={String(item.id)} className="border-b border-neutral-800">
                  <td className="max-w-[220px] truncate px-3 py-3 text-neutral-400">
                    {formatValue(item.id)}
                  </td>
                  <td className="px-3 py-3 text-neutral-300">
                    {formatValue(item.status ?? item.type ?? item.channel ?? "-")}
                  </td>
                  <td className="px-3 py-3 text-white">
                    {formatValue(
                      item.number ??
                        item.orderNumber ??
                        item.quoteNumber ??
                        item.invoiceNumber ??
                        item.fileName ??
                        item.subject ??
                        item.action ??
                        "-"
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

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await dashboardService.getCustomerDetails(id);

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
            Dane klienta oraz powiązane sesje, zlecenia, oferty, faktury i
            historia systemu.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Klient</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={customer.id} />
          <InfoCard label="Imię / nazwa" value={getCustomerDisplayName(customer)} />
          <InfoCard label="Email" value={customer.email} />
          <InfoCard label="Telefon" value={customer.phone} />
          <InfoCard label="Utworzono" value={customer.createdAt} />
          <InfoCard label="Aktualizacja" value={customer.updatedAt} />
        </div>
      </section>

      <div className="grid gap-6">
        <DataSection
          title="Sesje"
          items={sessions as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Wiadomości rozmów"
          items={conversationMessages as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Zlecenia"
          items={orders as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Oferty"
          items={quotes as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Faktury"
          items={invoices as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Płatności"
          items={payments as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Powiadomienia"
          items={notifications as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Załączniki"
          items={attachments as unknown as Record<string, unknown>[]}
        />

        <DataSection
          title="Audit Logi"
          items={auditLogs as unknown as Record<string, unknown>[]}
        />
      </div>
    </main>
  );
}