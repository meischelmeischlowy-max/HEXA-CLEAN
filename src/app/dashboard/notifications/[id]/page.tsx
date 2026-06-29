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
                </tr>
              ))}
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

  const result = (await dashboardService.getNotificationDetails(id)) as any;

  if (result.status !== "OK" || !result.details) {
    notFound();
  }

  const details = result.details;

  const notification = details.notification;
  const customer = details.customer;
  const order = details.order;
  const session = details.session;
  const conversationMessages = details.conversationMessages ?? [];
  const auditLogs = details.auditLogs ?? [];

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/notifications"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Wróć do powiadomień
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Szczegóły powiadomienia
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Pełne dane powiadomienia oraz powiązany klient, zlecenie, sesja,
            wiadomości rozmów i historia systemu.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="mb-4 text-xl font-bold">Powiadomienie</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="ID" value={notification.id} />
          <InfoCard label="Status" value={notification.status} />
          <InfoCard label="Kanał" value={notification.channel} />
          <InfoCard label="Typ" value={notification.type} />
          <InfoCard label="Klient ID" value={notification.customerId} />
          <InfoCard label="Zlecenie ID" value={notification.orderId} />
          <InfoCard label="Sesja ID" value={notification.sessionId} />
          <InfoCard label="Utworzono" value={notification.createdAt} />
          <InfoCard label="Wysłano" value={notification.sentAt} />
          <InfoCard label="Aktualizacja" value={notification.updatedAt} />

          <TextCard
            label="Temat"
            value={notification.subject ?? notification.title}
          />

          <TextCard
            label="Treść"
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
          title="Audit Logi"
          items={auditLogs as Record<string, unknown>[]}
        />
      </div>
    </main>
  );
}