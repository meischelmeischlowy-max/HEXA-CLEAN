import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import MarkOrderAsCompletedButton from "@/components/dashboard/MarkOrderAsCompletedButton";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

const prisma =
  globalForPrisma.hexaPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? "",
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hexaPrisma = prisma;
}

type Row = Record<string, any>;

type PrismaModel = {
  findUnique?: (args: any) => Promise<unknown>;
  findMany?: (args: any) => Promise<unknown>;
};

const prismaAny = prisma as unknown as Record<string, PrismaModel>;

async function safeFindUnique<T = Row>(
  modelName: string,
  args: any
): Promise<T | null> {
  const model = prismaAny[modelName];

  if (!model?.findUnique) {
    return null;
  }

  try {
    const result = await model.findUnique(args);
    return (result ?? null) as T | null;
  } catch {
    return null;
  }
}

async function safeFindMany<T = Row>(
  modelName: string,
  args: any
): Promise<T[]> {
  const model = prismaAny[modelName];

  if (!model?.findMany) {
    return [];
  }

  try {
    const result = await model.findMany(args);
    return Array.isArray(result) ? (result as T[]) : [];
  } catch {
    return [];
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return value.toLocaleString("de-CH");
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "object") {
    const asObject = value as { toString?: () => string };
    const stringValue = asObject.toString?.();

    if (stringValue && stringValue !== "[object Object]") {
      return stringValue;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function formatMoney(value: unknown, currency = "CHF") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return formatValue(value);
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(amount);
}

function customerName(customer: Row | null) {
  if (!customer) {
    return "—";
  }

  const fullName = `${customer.firstName ?? ""} ${
    customer.lastName ?? ""
  }`.trim();

  return (
    customer.companyName ??
    customer.name ??
    fullName ??
    customer.email ??
    customer.phone ??
    customer.id
  );
}

function statusLabel(status: unknown) {
  const value = String(status ?? "");

  const labels: Record<string, string> = {
    NEW: "Nowe",
    OPEN: "Otwarte",
    PENDING: "Oczekuje",
    IN_PROGRESS: "W trakcie",
    COMPLETED: "Abgeschlossen",
    CANCELLED: "Anulowane",
    PAID: "Bezahlt",
    PARTIALLY_PAID: "Teilweise bezahlt",
    UNPAID: "Unbezahlt",
    DRAFT: "Entwurf",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
  };

  return labels[value] ?? formatValue(status);
}

function InfoCard({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4 ${
        wide ? "md:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {formatValue(value)}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: unknown;
  href?: string | null;
}) {
  const content = (
    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 transition hover:border-cyan-400/60 hover:bg-cyan-500/10">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-bold text-white">
        {formatValue(value)}
      </p>
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function ActionButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  const classes =
    variant === "primary"
      ? "border-cyan-500 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-500/20"
      : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-cyan-500/70 hover:text-cyan-200";

  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${classes}`}
    >
      {children}
    </Link>
  );
}

function Section({
  title,
  children,
  count,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        {typeof count === "number" ? (
          <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
            {count}
          </span>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function MiniTable({
  title,
  items,
  basePath,
  columns,
}: {
  title: string;
  items: Row[];
  basePath?: string;
  columns: {
    label: string;
    value: (item: Row) => unknown;
    money?: boolean;
  }[];
}) {
  return (
    <Section title={title} count={items.length}>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Keine Daten.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className="border-b border-neutral-800 px-3 py-3"
                  >
                    {column.label}
                  </th>
                ))}

                <th className="border-b border-neutral-800 px-3 py-3">
                  Aktionen
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const itemId = item.id ? String(item.id) : "";

                return (
                  <tr
                    key={itemId || `${title}-${index}`}
                    className="border-b border-neutral-800"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className="max-w-[280px] truncate px-3 py-3 text-neutral-300"
                      >
                        {column.money
                          ? formatMoney(column.value(item), item.currency)
                          : formatValue(column.value(item))}
                      </td>
                    ))}

                    <td className="px-3 py-3">
                      {basePath && itemId ? (
                        <Link
                          href={`${basePath}/${itemId}`}
                          className="rounded-full border border-cyan-500/50 px-3 py-1 text-xs font-medium text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-500/10"
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
    </Section>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await safeFindUnique<Row>("order", {
    where: { id },
  });

  if (!order) {
    notFound();
  }

  const [customer, session, estimates, invoices, notifications, attachments, auditLogs] =
    await Promise.all([
      order.customerId
        ? safeFindUnique<Row>("customer", {
            where: { id: order.customerId },
          })
        : Promise.resolve(null),

      order.sessionId
        ? safeFindUnique<Row>("session", {
            where: { id: order.sessionId },
          })
        : Promise.resolve(null),

      safeFindMany<Row>("estimate", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("invoice", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("notification", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("attachment", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),

      safeFindMany<Row>("auditLog", {
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const invoiceIds = invoices
    .map((invoice) => invoice.id)
    .filter(Boolean)
    .map(String);

  const [payments, conversationMessages] = await Promise.all([
    invoiceIds.length > 0
      ? safeFindMany<Row>("payment", {
          where: {
            invoiceId: {
              in: invoiceIds,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),

    order.sessionId
      ? safeFindMany<Row>("conversationMessage", {
          where: { sessionId: order.sessionId },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const currency = String(order.currency ?? "CHF");
  const completed = order.status === "COMPLETED";

  const totalInvoices = invoices.reduce((sum, invoice) => {
    return sum + Number(invoice.totalAmount ?? invoice.amount ?? 0);
  }, 0);

  const totalPaid = payments.reduce((sum, payment) => {
    return sum + Number(payment.amount ?? payment.paidAmount ?? 0);
  }, 0);

  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/dashboard/orders"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Zurück zu Aufträgen
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Auftrag {formatValue(order.orderNumber ?? order.number ?? order.id)}
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-neutral-500">
            Vollständige Ansicht des Auftrags: Kunde, Leistungsdaten, Termine, Kalkulationen,
            Rechnungen, Zahlungen, Nachrichten, Anhänge und Änderungsverlauf.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <ActionButton href={`/dashboard/orders/${order.id}/edit`} variant="primary">
            Auftrag bearbeiten
          </ActionButton>

          <ActionButton href="/dashboard/orders">Auftragsliste</ActionButton>

          {customer?.id ? (
            <ActionButton href={`/dashboard/customers/${customer.id}`}>
              Kunde
            </ActionButton>
          ) : null}

          <ActionButton href={`/dashboard/estimates?orderId=${order.id}`}>
            Angebote
          </ActionButton>

          <ActionButton href={`/dashboard/invoices?orderId=${order.id}`}>
            Rechnungen
          </ActionButton>

          <ActionButton href={`/dashboard/payments?orderId=${order.id}`}>
            Zahlungen
          </ActionButton>

          {completed ? (
            <div className="rounded-xl border border-green-600 bg-green-950/50 px-4 py-3 text-sm font-semibold text-green-100">
              Auftrag abgeschlossen
            </div>
          ) : (
            <MarkOrderAsCompletedButton orderId={order.id} />
          )}
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Status" value={statusLabel(order.status)} />
        <StatCard label="Kunde" value={customerName(customer)} href={customer?.id ? `/dashboard/customers/${customer.id}` : null} />
        <StatCard label="Angebote" value={estimates.length} href={`/dashboard/estimates?orderId=${order.id}`} />
        <StatCard label="Rechnungen" value={invoices.length} href={`/dashboard/invoices?orderId=${order.id}`} />
        <StatCard label="Zahlungen" value={formatMoney(totalPaid, currency)} href={`/dashboard/payments?orderId=${order.id}`} />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Section title="Auftragsdaten">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="ID" value={order.id} />
            <InfoCard label="Numer" value={order.orderNumber ?? order.number} />
            <InfoCard label="Status" value={statusLabel(order.status)} />
            <InfoCard label="Leistungstyp" value={order.serviceType ?? order.type} />

            <InfoCard label="Titel" value={order.title} />
            <InfoCard label="Währung" value={currency} />
            <InfoCard
              label="Geschätzter Preis"
              value={formatMoney(order.estimatedPrice, currency)}
            />
            <InfoCard
              label="Endpreis"
              value={formatMoney(order.finalPrice, currency)}
            />

            <InfoCard label="Start" value={order.scheduledStart} />
            <InfoCard label="Koniec" value={order.scheduledEnd} />
            <InfoCard label="Erstellt am" value={order.createdAt} />
            <InfoCard label="Aktualisiert am" value={order.updatedAt} />

            <InfoCard label="Straße / Dienstadresse" value={order.serviceStreet} />
            <InfoCard label="PLZ" value={order.serviceZipCode} />
            <InfoCard label="Ort" value={order.serviceCity} />
            <InfoCard label="Land" value={order.serviceCountry} />

            <InfoCard label="Beschreibung" value={order.description} wide />
            <InfoCard label="Notizen" value={order.notes} wide />
          </div>
        </Section>

        <div className="grid gap-6">
          <Section title="Kunde">
            {customer ? (
              <div className="grid gap-4">
                <InfoCard label="Name" value={customerName(customer)} />
                <InfoCard label="Email" value={customer.email} />
                <InfoCard label="Telefon" value={customer.phone} />
                <InfoCard
                  label="Adresse"
                  value={[
                    customer.street,
                    customer.zipCode,
                    customer.city,
                    customer.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />

                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                >
                  Kundenkarte öffnen
                </Link>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Kein zugehöriger Kunde vorhanden.
              </p>
            )}
          </Section>

          <Section title="Finanzübersicht">
            <div className="grid gap-4">
              <InfoCard
                label="Rechnungsbetrag"
                value={formatMoney(totalInvoices, currency)}
              />
              <InfoCard
                label="Zahlungsbetrag"
                value={formatMoney(totalPaid, currency)}
              />
              <InfoCard
                label="Offen"
                value={formatMoney(totalInvoices - totalPaid, currency)}
              />
            </div>
          </Section>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-2">
        <Section title="Sitzung / Gespräch">
          {session ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="ID sesji" value={session.id} />
              <InfoCard label="Status" value={session.status} />
              <InfoCard label="Kanal" value={session.channel} />
              <InfoCard label="Erstellt am" value={session.createdAt} />
              <InfoCard label="Beendet am" value={session.endedAt} />
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Keine verknüpfte Sitzung.</p>
          )}
        </Section>

        <Section title="Schnellaktionen">
          <div className="grid gap-3 md:grid-cols-2">
            <ActionButton href={`/dashboard/orders/${order.id}/edit`} variant="primary">
              Daten korrigieren
            </ActionButton>

            <ActionButton href={`/dashboard/estimates?orderId=${order.id}`}>
              Zu Angeboten
            </ActionButton>

            <ActionButton href={`/dashboard/invoices?orderId=${order.id}`}>
              Zu Rechnungen
            </ActionButton>

            <ActionButton href={`/dashboard/payments?orderId=${order.id}`}>
              Zu Zahlungen
            </ActionButton>
          </div>
        </Section>
      </section>

      <div className="grid gap-6">
        <MiniTable
          title="Angebote"
          items={estimates}
          basePath="/dashboard/estimates"
          columns={[
            {
              label: "Numer",
              value: (item) => item.estimateNumber ?? item.number ?? item.id,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Kwota",
              value: (item) => item.totalAmount ?? item.amount,
              money: true,
            },
            {
              label: "Utworzono",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Rechnungen"
          items={invoices}
          basePath="/dashboard/invoices"
          columns={[
            {
              label: "Numer",
              value: (item) => item.invoiceNumber ?? item.number ?? item.id,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Gesamt",
              value: (item) => item.totalAmount ?? item.amount,
              money: true,
            },
            {
              label: "Bezahlt",
              value: (item) => item.paidAmount,
              money: true,
            },
            {
              label: "Fällig am",
              value: (item) => item.dueDate,
            },
          ]}
        />

        <MiniTable
          title="Zahlungen"
          items={payments}
          basePath="/dashboard/payments"
          columns={[
            {
              label: "Referenz",
              value: (item) =>
                item.paymentReference ??
                item.externalRef ??
                item.reference ??
                item.id,
            },
            {
              label: "Methode",
              value: (item) => item.method ?? item.paymentMethod,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Kwota",
              value: (item) => item.amount ?? item.paidAmount,
              money: true,
            },
            {
              label: "Data",
              value: (item) => item.paidAt ?? item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Gesprächsnachrichten"
          items={conversationMessages}
          columns={[
            {
              label: "Rolle",
              value: (item) => item.role ?? item.sender ?? item.type,
            },
            {
              label: "Inhalt",
              value: (item) =>
                item.content ?? item.message ?? item.text ?? item.body,
            },
            {
              label: "Utworzono",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Benachrichtigungen"
          items={notifications}
          basePath="/dashboard/notifications"
          columns={[
            {
              label: "Kanal",
              value: (item) => item.channel ?? item.type,
            },
            {
              label: "Status",
              value: (item) => statusLabel(item.status),
            },
            {
              label: "Betreff",
              value: (item) => item.subject ?? item.title ?? item.message,
            },
            {
              label: "Utworzono",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Anhänge"
          items={attachments}
          basePath="/dashboard/attachments"
          columns={[
            {
              label: "Datei",
              value: (item) => item.fileName ?? item.name ?? item.id,
            },
            {
              label: "Typ",
              value: (item) => item.mimeType ?? item.type,
            },
            {
              label: "Rozmiar",
              value: (item) => item.size ?? item.fileSize,
            },
            {
              label: "Utworzono",
              value: (item) => item.createdAt,
            },
          ]}
        />

        <MiniTable
          title="Audit logi"
          items={auditLogs}
          basePath="/dashboard/audit-logs"
          columns={[
            {
              label: "Aktion",
              value: (item) => item.action ?? item.event,
            },
            {
              label: "Benutzer",
              value: (item) => item.userEmail ?? item.userId ?? item.actor,
            },
            {
              label: "Beschreibung",
              value: (item) => item.description ?? item.message,
            },
            {
              label: "Data",
              value: (item) => item.createdAt,
            },
          ]}
        />
      </div>
    </main>
  );
}