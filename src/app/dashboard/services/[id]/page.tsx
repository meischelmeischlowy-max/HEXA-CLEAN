import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const dynamic = "force-dynamic";

const TENANT_KEY = "hexa-clean";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return value.toLocaleString("de-CH");
  }

  return String(value);
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return formatValue(value);
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(number);
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

export default async function ServiceCatalogItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const service = await prisma.serviceCatalogItem.findFirst({
    where: {
      id,
      tenantKey: TENANT_KEY,
    },
    include: {
      estimateItems: {
        include: {
          estimate: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href="/dashboard/services"
            className="text-sm text-cyan-400 transition hover:text-cyan-300"
          >
            ← Zurück zum Leistungsverzeichnis
          </Link>

          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS / Leistungsverzeichnis
          </p>

          <h1 className="mt-3 text-3xl font-bold">{service.name}</h1>

          <p className="mt-2 max-w-3xl text-sm text-neutral-500">
            Details zur Leistungsverzeichnisposition und deren Verbindungen zu Kalkulationen.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/services/${service.id}/edit`}
            className="rounded-xl border border-cyan-500 bg-cyan-500/15 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25"
          >
            Leistung bearbeiten
          </Link>

          <Link
            href="/dashboard/services"
            className="rounded-xl border border-neutral-700 bg-neutral-950 px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            Leistungen
          </Link>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Status"
          value={service.isActive ? "Aktiv" : "Inaktiv"}
        />
        <InfoCard label="Kategoria" value={service.category} />
        <InfoCard label="Jednostka" value={service.unit} />
        <InfoCard label="Slug" value={service.slug} />

        <InfoCard label="Basispreis" value={formatMoney(service.basePrice)} />
        <InfoCard label="Mindestpreis" value={formatMoney(service.minPrice)} />
        <InfoCard label="Maximalpreis" value={formatMoney(service.maxPrice)} />
        <InfoCard label="Standardmenge" value={service.defaultQuantity} />

        <InfoCard label="Risikofaktor" value={service.riskMultiplier} />
        <InfoCard label="Sortowanie" value={service.sortOrder} />
        <InfoCard label="Erstellt" value={service.createdAt} />
<InfoCard label="Aktualisiert am" value={service.updatedAt} />

        <InfoCard label="Beschreibung" value={service.description} wide />
        <InfoCard label="Notizen" value={service.notes} wide />
      </section>

      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Zugehörige Kalkulationspositionen</h2>

          <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
            {service.estimateItems.length}
          </span>
        </div>

        {service.estimateItems.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Diese Leistung wird noch nicht in Kalkulationen verwendet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                <tr>
                  <th className="border-b border-neutral-800 px-3 py-3">
                    Kalkulation
                  </th>
                  <th className="border-b border-neutral-800 px-3 py-3">
                    Beschreibung
                  </th>
                  <th className="border-b border-neutral-800 px-3 py-3">
                    Menge
                  </th>
                  <th className="border-b border-neutral-800 px-3 py-3">
                    Einzelpreis
                  </th>
                  <th className="border-b border-neutral-800 px-3 py-3">
                    Aktion
                  </th>
                </tr>
              </thead>

              <tbody>
                {service.estimateItems.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-800">
                    <td className="px-3 py-3 text-neutral-300">
                      {item.estimate?.estimateNumber ??
                        item.estimate?.id ??
                        "—"}
                    </td>

                    <td className="max-w-[320px] truncate px-3 py-3 text-white">
                      {item.description ?? "—"}
                    </td>

                    <td className="px-3 py-3 text-neutral-300">
                      {formatValue(item.quantity)}
                    </td>

                    <td className="px-3 py-3 text-neutral-300">
                      {formatMoney(item.unitPrice)}
                    </td>

                    <td className="px-3 py-3">
                      {item.estimate?.id ? (
                        <Link
                          href={`/dashboard/estimates/${item.estimate.id}`}
                          className="rounded-full border border-cyan-500/50 px-3 py-1 text-xs font-medium text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-500/10"
                        >
                          Kalkulation öffnen
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}