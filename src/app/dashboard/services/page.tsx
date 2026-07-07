"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DashboardTable, {
  type DashboardTableColumn,
} from "../../../components/dashboard/DashboardTable";
import EmptyState from "../../../components/dashboard/EmptyState";
import MetricCard from "../../../components/dashboard/MetricCard";
import PageHeader from "../../../components/dashboard/PageHeader";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../components/dashboard/StatusBadge";

type ServiceCatalogItem = {
  id: string;
  tenantKey?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  unit: string;
  basePrice?: string | number | null;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  defaultQuantity?: string | number | null;
  riskMultiplier?: string | number | null;
  isActive: boolean;
  sortOrder?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardServicesResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    services: ServiceCatalogItem[];
  };
};

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isNaN(parsed) ? null : parsed;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMoney(value?: string | number | null, currency = "CHF") {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatDecimal(value?: string | number | null) {
  const numberValue = toNumber(value);

  if (numberValue === null) {
    return "—";
  }

  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatCategory(category?: string | null) {
  if (!category) return "—";

  const labels: Record<string, string> = {
    REINIGUNG: "Reinigung",
    HAUSWARTUNG: "Hauswartung",
    KLEINREPARATUREN: "Kleinreparaturen",
    UMZUGSREINIGUNG: "Umzugsreinigung",
    FENSTERREINIGUNG: "Mycie okien",
    WOHNUNGSABGABE: "Oddanie mieszkania",
    SPEZIALREINIGUNG: "Czyszczenie specjalne",
    OTHER: "Inne",
  };

  return labels[category.toUpperCase()] ?? category;
}

function formatUnit(unit?: string | null) {
  if (!unit) return "—";

  const labels: Record<string, string> = {
    FLAT: "Pauschal",
    HOUR: "Godzina",
    M2: "m²",
    ROOM: "Zimmer",
    WINDOW: "Okno",
    PIECE: "Sztuka",
    KM: "Kilometr",
    CUSTOM: "Eigene Einheit",
  };

  return labels[unit.toUpperCase()] ?? unit;
}

function getServiceStatus(service: ServiceCatalogItem) {
  return service.isActive ? "ACCEPTED" : "CANCELLED";
}

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
        primary
          ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-500/20"
          : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function DashboardServicesPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/services", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Die Leistungsverzeichnis-API hat einen Fehler zurückgegeben.");
      }

      const json: DashboardServicesResponse = await response.json();

      setServices(json.data.services ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown services error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const seedDemoServices = useCallback(async () => {
    setSeeding(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/services", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Die Beispieldaten-API für Leistungen hat einen Fehler zurückgegeben.");
      }

      const json: DashboardServicesResponse = await response.json();

      setServices(json.data.services ?? []);
      await loadServices();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unknown services seed error"
      );
    } finally {
      setSeeding(false);
    }
  }, [loadServices]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const stats = useMemo(() => {
    const active = services.filter((service) => service.isActive).length;
    const inactive = services.length - active;

    const averageBasePrice =
      services.length > 0
        ? services.reduce((sum, service) => {
            const amount = toNumber(service.basePrice);
            return amount === null ? sum : sum + amount;
          }, 0) / services.length
        : 0;

    const highRisk = services.filter((service) => {
      const risk = toNumber(service.riskMultiplier) ?? 1;
      return risk > 1;
    }).length;

    return {
      total: services.length,
      active,
      inactive,
      averageBasePrice,
      highRisk,
    };
  }, [services]);

  const columns: DashboardTableColumn<ServiceCatalogItem>[] = [
    {
      key: "service",
      header: "Leistung",
      render: (service) => (
        <div>
          <Link
            href={`/dashboard/services/${service.id}`}
            className="font-black tracking-tight text-white transition hover:text-cyan-200"
          >
            {service.name}
          </Link>

          <p className="mt-1 text-xs text-zinc-500">Slug: {service.slug}</p>

          {service.description ? (
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              {service.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategorie",
      render: (service) => (
        <div>
          <p className="font-semibold text-zinc-200">
            {formatCategory(service.category)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{service.category}</p>
        </div>
      ),
    },
    {
      key: "unit",
      header: "Einheit",
      render: (service) => (
        <p className="font-semibold text-zinc-200">
          {formatUnit(service.unit)}
        </p>
      ),
    },
    {
      key: "prices",
      header: "Preise",
      render: (service) => (
        <div>
          <p className="font-black text-emerald-100">
            {formatMoney(service.basePrice)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Min: {formatMoney(service.minPrice)} · Max:{" "}
            {formatMoney(service.maxPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risiko",
      render: (service) => (
        <div>
          <p className="font-semibold text-zinc-200">
            x{formatDecimal(service.riskMultiplier)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Standardmenge: {formatDecimal(service.defaultQuantity)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (service) => (
        <StatusBadge
          status={getServiceStatus(service)}
          label={service.isActive ? "Aktywna" : "Nieaktywna"}
        />
      ),
    },
    {
      key: "updated",
      header: "Aktualizacja",
      render: (service) => (
        <p className="text-sm font-medium text-zinc-400">
          {formatDate(service.updatedAt ?? service.createdAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Aktionen",
      render: (service) => (
        <div className="flex flex-wrap gap-2">
          <ActionLink href={`/dashboard/services/${service.id}`} primary>
            Details
          </ActionLink>

          <ActionLink href={`/dashboard/services/${service.id}/edit`}>
            Bearbeiten
          </ActionLink>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS / Service Catalog"
          title="Leistungsverzeichnis"
          description="Grundlage für den Kalkulationsrechner, AI Concierge, Angebote und Rechnungen. Hier definieren wir, wie der Preis im System berechnet werden soll."
        >
          <PremiumButton href="/dashboard/services/new" variant="primary">
            Leistung hinzufügen
          </PremiumButton>

          <PremiumButton
            type="button"
            variant="secondary"
            onClick={seedDemoServices}
            disabled={loading || seeding}
          >
            {seeding ? "Wird ergänzt..." : "Beispielkatalog hinzufügen"}
          </PremiumButton>

          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadServices}
            disabled={loading || seeding}
          >
            Aktualisieren
          </PremiumButton>

          <PremiumButton href="/dashboard/estimates" variant="ghost">
            Kalkulationen
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Alle Leistungen"
            value={String(stats.total)}
            description="Gesamtzahl der Positionen im Leistungsverzeichnis."
            trend="Quelle: Leistungs-API"
            tone="cyan"
            icon={<span className="text-lg font-black">SVC</span>}
          />

          <MetricCard
            title="Aktiv"
            value={String(stats.active)}
            description="Positionen, die für den Kalkulationsrechner verfügbar sind."
            trend={`Inaktiv: ${stats.inactive}`}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />

          <MetricCard
            title="Durchschnittspreis"
            value={formatMoney(stats.averageBasePrice)}
            description="Durchschnittlicher Basispreis aus dem Leistungsverzeichnis."
            trend="Kalkulationspreis"
            tone="amber"
            icon={<span className="text-lg font-black">CHF</span>}
          />

          <MetricCard
            title="Risiko"
            value={String(stats.highRisk)}
            description="Leistungen mit einem Risikomultiplikator über x1.00."
            trend="Zur Prüfung bei der Kalkulation"
            tone="violet"
            icon={<span className="text-lg font-black">AI</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Leistungsverzeichnis wird geladen"
            description="HEXA OS lädt das aktuelle Leistungsverzeichnis."
          >
            <div className="grid gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                />
              ))}
            </div>
          </DashboardPanel>
        ) : null}

        {errorMessage ? (
          <DashboardPanel
            title="Fehler im Leistungsmodul"
            description="Das Leistungsverzeichnis konnte nicht aus der API geladen werden."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Fehler: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Prüfen Sie den Endpoint /api/dashboard/services, den Prisma Client sowie die Datenbankverbindung.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Leistungsliste"
            description={`Anzahl Datensätze: ${services.length}. Dieser Katalog wird vom Kalkulationsmodul und späteren Vision-AI-Funktionen verwendet.`}
            action={
              <StatusBadge
                status={services.length > 0 ? "ACCEPTED" : "PENDING"}
                label={services.length > 0 ? "Katalog aktiv" : "Keine Einträge"}
              />
            }
          >
            <DashboardTable
              columns={columns}
              rows={services}
              getRowKey={(service) => service.id}
              empty={
                <EmptyState
                  title="Keine Leistungen im Katalog"
                  description="Erstellen Sie die erste Leistung manuell oder verwenden Sie einen Beispielkatalog."
                  actionLabel="Leistung hinzufügen"
                  actionHref="/dashboard/services/new"
                />
              }
            />
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola Service Catalog"
            description="Dieses Modul ist die Grundlage für die offizielle Kalkulationsengine: Die KI kann Vorschläge liefern, aber der Preis muss sich aus dem Katalog, den Regeln und der Freigabe durch einen Menschen ergeben."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Ceny bazowe
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Jede Leistung hat eine Einheit, einen Basispreis, ein Minimum und optional ein maximales Limit.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Risiko und Fotos
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Später bewertet Vision AI die Bilder und schlägt einen Risikomultiplikator vor, ohne den Preis selbst zu genehmigen.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  MM Digital Core
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Dieser Katalog ist für Mandanten vorbereitet, also für verschiedene Unternehmen mit eigenem Leistungsverzeichnis.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}