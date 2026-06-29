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
    return JSON.stringify(value, null, 2);
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

function JsonCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 md:col-span-2 xl:col-span-4">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <pre className="mt-2 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-neutral-950 p-4 text-xs text-neutral-200">
        {formatValue(value)}
      </pre>
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
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <tr>
                <th className="border-b border-neutral-800 px-3 py-3">ID</th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Typ / Rola
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Treść / Akcja
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
                    {formatValue(item.type ?? item.role ?? item.entityType)}
                  </td>

                  <td className="max-w-[480px] truncate px-3 py-3 text-white">
                    {formatValue(
                      item.action ??
                        item.content ??
                        item.message ??
                        item.body ??
                        item.subject
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

export default async function AuditLogDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = (await dashboardService.getAuditLogDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = result.details;

  const auditLog = details.auditLog;
  const customer = details.customer;
  const order = details.order;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const relatedAuditLogs = details.relatedAuditLogs ?? [];

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/audit-logs"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do audit logów
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">Szczegóły audit logu</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełny zapis zdarzenia systemowego oraz powiązany klient, zlecenie,
            sesja, wiadomości rozmów i podobne logi.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Audit Log</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={auditLog.id} />
          <InfoCard label="Akcja" value={auditLog.action} />
          <InfoCard label="Entity Type" value={auditLog.entityType} />
          <InfoCard label="Entity ID" value={auditLog.entityId} />
          <InfoCard label="Klient ID" value={auditLog.customerId} />
          <InfoCard label="Zlecenie ID" value={auditLog.orderId} />
          <InfoCard label="Sesja ID" value={auditLog.sessionId} />
          <InfoCard label="User ID" value={auditLog.userId} />
          <InfoCard label="Actor ID" value={auditLog.actorId} />
          <InfoCard label="IP" value={auditLog.ipAddress} />
          <InfoCard label="Utworzono" value={auditLog.createdAt} />
          <InfoCard label="Aktualizacja" value={auditLog.updatedAt} />

          <JsonCard
            label="Dane / Metadata"
            value={auditLog.data ?? auditLog.metadata ?? auditLog.payload}
          />

          <JsonCard
            label="Before"
            value={auditLog.before ?? auditLog.beforeData}
          />

          <JsonCard label="After" value={auditLog.after ?? auditLog.afterData} />

          <JsonCard label="User Agent" value={auditLog.userAgent} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-3">
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
          <h2 className="mb-4 text-xl font-bold">Zlecenie</h2>

          {order ? (
            <div className="grid gap-4">
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
          title="Powiązane Audit Logi"
          items={relatedAuditLogs as Record<string, unknown>[]}
        />
      </div>
    </main>
  );
}