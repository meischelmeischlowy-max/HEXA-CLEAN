import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PrismaClient,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import ServiceCatalogForm from "@/components/dashboard/ServiceCatalogForm";

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

export default async function EditServiceCatalogItemPage({
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
  });

  if (!service) {
    notFound();
  }

  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mb-8">
        <Link
          href={`/dashboard/services/${service.id}`}
          className="text-sm text-cyan-400 transition hover:text-cyan-300"
        >
          ← Wróć do usługi
        </Link>

        <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
          HEXA OS / Cennik
        </p>

        <h1 className="mt-3 text-3xl font-bold">Edytuj usługę</h1>

        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Popraw dane pozycji cennika. Zmiany będą używane przy kolejnych
          wycenach, ofertach i fakturach.
        </p>
      </div>

      <ServiceCatalogForm
        mode="edit"
        categories={Object.values(ServiceCatalogCategory)}
        units={Object.values(ServiceCatalogUnit)}
        initialService={{
          id: service.id,
          name: service.name,
          slug: service.slug,
          description: service.description ?? "",
          category: service.category,
          unit: service.unit,
          basePrice: String(service.basePrice),
          minPrice: String(service.minPrice),
          maxPrice: service.maxPrice ? String(service.maxPrice) : "",
          defaultQuantity: service.defaultQuantity
            ? String(service.defaultQuantity)
            : "",
          riskMultiplier: String(service.riskMultiplier),
          isActive: service.isActive,
          sortOrder: String(service.sortOrder),
          notes: service.notes ?? "",
        }}
      />
    </main>
  );
}