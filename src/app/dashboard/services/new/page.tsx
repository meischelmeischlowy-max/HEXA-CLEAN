import Link from "next/link";
import {
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";

import ServiceCatalogForm from "@/components/dashboard/ServiceCatalogForm";

export const dynamic = "force-dynamic";

export default function NewServiceCatalogItemPage() {
  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mb-8">
        <Link
          href="/dashboard/services"
          className="text-sm text-cyan-400 transition hover:text-cyan-300"
        >
          ← Zurück zu den Leistungen
        </Link>

        <p className="mt-4 text-xs uppercase tracking-[0.35em] text-cyan-400">
          HEXA OS / Leistungen
        </p>

        <h1 className="mt-3 text-3xl font-bold">Leistung hinzufügen</h1>

        <p className="mt-2 max-w-3xl text-sm text-neutral-500">
          Manuelle Erstellung einer Leistung. Diese Daten werden später verwendet in
          Kalkulationen, Angebotch i Rechnungenach.
        </p>
      </div>

      <ServiceCatalogForm
        mode="create"
        categories={Object.values(ServiceCatalogCategory)}
        units={Object.values(ServiceCatalogUnit)}
      />
    </main>
  );
}