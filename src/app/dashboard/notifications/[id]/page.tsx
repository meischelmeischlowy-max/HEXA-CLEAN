import Link from "next/link";
import { notFound } from "next/navigation";

import RecordLink from "@/components/dashboard/RecordLink";
import { dashboardService } from "@/services/dashboardService";

type RecordItem = Record<string, unknown>;

function asRecord(value: unknown): RecordItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as RecordItem;
}

function asOptionalRecord(value: unknown): RecordItem | null {
  const record = asRecord(value);
  return Object.keys(record).length > 0 ? record : null;
}

function toRecords(value: unknown): RecordItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is RecordItem => {
    return Boolean(item && typeof item === "object" && !Array.isArray(item));
  });
}

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

function TextCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 md:col-span-2 xl:col-span-4">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white">
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
                  Inhalt / Aktion
                </th>
                <th className="border-b border-neutral-800 px-3 py-3">
                  Data
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
                      {formatValue(item.status ?? item.type ?? item.role)}
                    </td>

                    <td className="max-w-[420px] truncate px-3 py-3 text-white">
                      {formatValue(
                        item.content ??
                          item.message ??
                          item.body ??
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

export default async function NotificationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = asRecord(
    await dashboardService.getNotificationDetails(id),
  );

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = asRecord(result.details);

  const notification = asRecord(details.notification);
  const customer = asOptionalRecord(details.customer);
  const order = asOptionalRecord(details.order);
  const session = asOptionalRecord(details.session);
  const conversationMessages = toRecords(details.conversationMessages);
  const auditLogs = toRecords(details.auditLogs);

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/notifications"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Zurück zu Benachrichtigungen
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Benachrichtigungsdetails
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Vollständige Benachrichtigungsdaten inklusive zugehörigem Kunden, Auftrag, Sitzung,
            Gesprächsnachrichten und Systemverlauf.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h2 className="mb-4 text-xl font-bold">Szybka nawigacja CRM</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RecordLink
            label="Kunde"
            href={customer?.id ? `/dashboard/customers/${customer.id}` : null}
            value={formatValue(customer?.name ?? customer?.email ?? customer?.id)}
          />

          <RecordLink
            label="Auftrag"
            href={order?.id ? `/dashboard/orders/${order.id}` : null}
            value={formatValue(order?.orderNumber ?? order?.number ?? order?.id)}
          />

          <RecordLink
            label="Pierwszy audit log"
            href={
              auditLogs[0]?.id
                ? `/dashboard/audit-logs/${auditLogs[0].id}`
                : null
            }
            value={formatValue(auditLogs[0]?.action ?? auditLogs[0]?.id)}
          />

          <RecordLink
            label="Powiadomienie"
            href={`/dashboard/notifications/${notification.id}`}
            value={formatValue(notification.subject ?? notification.title ?? notification.id)}
          />
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Powiadomienie</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={notification.id} />
          <InfoCard label="Status" value={notification.status} />
          <InfoCard label="Kanal" value={notification.channel} />
          <InfoCard label="Typ" value={notification.type} />
          <InfoCard label="Kunden-ID" value={notification.customerId} />
          <InfoCard label="Auftrag ID" value={notification.orderId} />
          <InfoCard label="Sesja ID" value={notification.sessionId} />
          <InfoCard label="Erstellt" value={notification.createdAt} />
          <InfoCard label="Gesendet" value={notification.sentAt} />
          <InfoCard label="Aktualisierung" value={notification.updatedAt} />

          <TextCard
            label="Temat"
            value={notification.subject ?? notification.title}
          />

          <TextCard
            label="Inhalt"
            value={
              notification.content ??
              notification.message ??
              notification.body ??
              notification.payload
            }
          />
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
                value={formatValue(customer.name ?? customer.email ?? customer.id)}
              />
              <InfoCard label="ID" value={customer.id} />
              <InfoCard label="Name" value={customer.name} />
              <InfoCard label="Email" value={customer.email} />
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
                value={formatValue(order.orderNumber ?? order.number ?? order.id)}
              />
              <InfoCard label="ID" value={order.id} />
              <InfoCard
                label="Numer"
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
          <h2 className="mb-4 text-xl font-bold">Sesja</h2>

          {session ? (
            <div className="grid gap-4">
              <InfoCard label="ID" value={session.id} />
              <InfoCard label="Status" value={session.status} />
              <InfoCard label="Erstellt" value={session.createdAt} />
              <InfoCard label="Beendet" value={session.endedAt} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Keine verknüpfte Sitzung.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6">
        <DataSection
          title="Gesprächsnachrichten"
          items={conversationMessages as Record<string, unknown>[]}
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
