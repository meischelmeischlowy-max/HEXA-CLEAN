import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EstimateStatusActions from "../../../../components/dashboard/EstimateStatusActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
    });
  }

  return globalForPrisma.hexaPrisma;
}

function formatMoney(value: unknown, currency = "CHF") {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(number);
}

function formatNumber(value: unknown) {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Robocza",
    AI_REVIEW: "AI sprawdza",
    NEEDS_PHOTOS: "Potrzebne zdjęcia",
    NEEDS_HUMAN_REVIEW: "Do kontroli właściciela",
    READY_TO_SEND: "Gotowa do wysłania",
    SENT: "Wysłana",
    ACCEPTED: "Zaakceptowana",
    REJECTED: "Odrzucona",
    EXPIRED: "Wygasła",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function metadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  if (!(key in metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function auditActionLabel(action: string | null | undefined) {
  const labels: Record<string, string> = {
    CREATE: "Utworzono",
    UPDATE: "Zmieniono",
    DELETE: "Usunięto",
    SEND: "Wysłano",
    ACCEPT: "Zaakceptowano",
    REJECT: "Odrzucono",
  };

  if (!action) {
    return "Zdarzenie";
  }

  return labels[action] ?? action;
}

function auditStatusChange(before: unknown, after: unknown) {
  const beforeStatus = metadataText(before, "status");
  const afterStatus = metadataText(after, "status");

  if (!beforeStatus && !afterStatus) {
    return null;
  }

  return `${statusLabel(beforeStatus)} → ${statusLabel(afterStatus)}`;
}

export default async function DashboardEstimateDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const estimate = await prisma.estimate.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      order: true,
      session: true,
      items: {
        include: {
          serviceCatalogItem: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      attachments: true,
      notifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!estimate) {
    notFound();
  }

  const latestAuditLog = estimate.auditLogs[0];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/dashboard/estimates"
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Wróć do wycen
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Estimate
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                {estimate.estimateNumber}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                {estimate.title ?? "Robocza wycena"}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">
                Status
              </p>
              <p className="mt-2 text-lg font-black text-cyan-100">
                {statusLabel(estimate.status)}
              </p>
            </div>
          </div>
        </section>

        <EstimateStatusActions
          estimateId={estimate.id}
          currentStatus={estimate.status}
        />

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Klient</p>
            <p className="mt-2 text-xl font-semibold">
              {customerName(estimate.customer)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {estimate.customer?.email ??
                estimate.customer?.phone ??
                "Brak kontaktu"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Miejsce usługi</p>
            <p className="mt-2 text-xl font-semibold">
              {estimate.serviceCity ?? "—"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {[estimate.serviceStreet, estimate.serviceZipCode]
                .filter(Boolean)
                .join(", ") || "Brak adresu"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Utworzono</p>
            <p className="mt-2 text-xl font-semibold">
              {formatDate(estimate.createdAt)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Źródło: {estimate.source ?? "—"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Ostatnia aktywność</p>
            <p className="mt-2 text-xl font-semibold">
              {latestAuditLog ? formatDate(latestAuditLog.createdAt) : "—"}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {latestAuditLog?.message ?? "Brak historii zmian"}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
            <p className="text-sm text-cyan-100/70">Suma</p>
            <p className="mt-2 text-3xl font-black text-cyan-100">
              {formatMoney(estimate.total, estimate.currency)}
            </p>
            <p className="mt-1 text-sm text-cyan-100/60">
              Cena robocza, nieoficjalna
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pozycje wyceny</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Kalkulacja z katalogu usług albo z ręcznego formularza.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Właściciel musi zatwierdzić cenę przed wysłaniem klientowi.
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                <tr>
                  <th className="px-4 py-4">Usługa</th>
                  <th className="px-4 py-4">Ilość</th>
                  <th className="px-4 py-4">Cena</th>
                  <th className="px-4 py-4">Mnożnik</th>
                  <th className="px-4 py-4">Ryzyko</th>
                  <th className="px-4 py-4 text-right">Razem</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {estimate.items.map((item) => {
                  const manualUnit = metadataText(item.metadata, "manualUnit");
                  const unit = item.unit ?? manualUnit ?? "—";

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-neutral-100">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.description ?? item.category ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {formatNumber(item.quantity)} {unit}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {formatMoney(item.unitPrice, estimate.currency)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        x{formatNumber(item.riskMultiplier)}
                      </td>
                      <td className="px-4 py-4 text-neutral-300">
                        {formatMoney(item.riskAmount, estimate.currency)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatMoney(item.total, estimate.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {estimate.items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Brak pozycji wyceny.
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Subtotal</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.subtotal, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Ryzyko</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.riskAmount, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Dojazd</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.travelFee, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Rabat</p>
            <p className="mt-2 text-xl font-semibold">
              {formatMoney(estimate.discountAmount, estimate.currency)}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300 p-5 text-neutral-950">
            <p className="text-sm font-semibold opacity-70">Total</p>
            <p className="mt-2 text-2xl font-black">
              {formatMoney(estimate.total, estimate.currency)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Widełki AI / demo</h2>
            <p className="mt-4 text-2xl font-black text-cyan-200">
              {formatMoney(estimate.aiMinTotal, estimate.currency)} –{" "}
              {formatMoney(estimate.aiMaxTotal, estimate.currency)}
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {estimate.aiNotes ??
                "Brak analizy AI. To miejsce jest przygotowane pod przyszłą analizę zdjęć i ryzyka."}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Notatki</h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Dla klienta
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {estimate.notesCustomer ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Wewnętrzne
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {estimate.notesInternal ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Historia wyceny</h2>
            <p className="text-sm text-neutral-400">
              Techniczny audit log: utworzenie wyceny, zmiany statusu i późniejsze
              decyzje właściciela.
            </p>
          </div>

          {estimate.auditLogs.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Brak historii zmian.
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {estimate.auditLogs.map((log) => {
                const statusChange = auditStatusChange(log.before, log.after);

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                          {auditActionLabel(log.action)}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-neutral-300">
                          {log.message ?? "Zdarzenie bez opisu."}
                        </p>

                        {statusChange ? (
                          <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                            Status: {statusChange}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-sm font-semibold text-neutral-200">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                          {log.actorType ?? "system"} · {log.entityType ?? "Estimate"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Załączniki</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.attachments.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Później zdjęcia klienta i Vision AI.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Powiadomienia</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.notifications.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Później SMS/email do właściciela.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Audit log</h2>
            <p className="mt-2 text-3xl font-black">
              {estimate.auditLogs.length}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Historia zmian i decyzji.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}