"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityTimeline from "../../../components/dashboard/ActivityTimeline";
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
    REINIGUNG: "Sprzątanie",
    HAUSWARTUNG: "Hauswartung",
    KLEINREPARATUREN: "Małe naprawy",
    UMZUGSREINIGUNG: "Sprzątanie po przeprowadzce",
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
    FLAT: "Ryczałt",
    HOUR: "Godzina",
    M2: "m²",
    ROOM: "Pokój",
    WINDOW: "Okno",
    PIECE: "Sztuka",
    KM: "Kilometr",
    CUSTOM: "Własna jednostka",
  };

  return labels[unit.toUpperCase()] ?? unit;
}

function getServiceStatus(service: ServiceCatalogItem) {
  return service.isActive ? "ACCEPTED" : "CANCELLED";
}

export default function DashboardServicesPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/services", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Dashboard Services API returned an error");
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

  const latestServices = useMemo(() => {
    return services.slice(0, 4).map((service) => ({
      id: service.id,
      title: service.name,
      description: `${formatCategory(service.category)} · ${formatMoney(
        service.basePrice
      )} / ${formatUnit(service.unit)}`,
      status: getServiceStatus(service),
      time: formatDate(service.updatedAt ?? service.createdAt),
    }));
  }, [services]);

  const columns: DashboardTableColumn<ServiceCatalogItem>[] = [
    {
      key: "service",
      header: "Usługa",
      render: (service) => (
        <div>
          <p className="font-black tracking-tight text-white">{service.name}</p>
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
      header: "Kategoria",
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
      header: "Jednostka",
      render: (service) => (
        <p className="font-semibold text-zinc-200">
          {formatUnit(service.unit)}
        </p>
      ),
    },
    {
      key: "prices",
      header: "Ceny",
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
      header: "Ryzyko",
      render: (service) => (
        <div>
          <p className="font-semibold text-zinc-200">
            x{formatDecimal(service.riskMultiplier)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ilość domyślna: {formatDecimal(service.defaultQuantity)}
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
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="HEXA OS / Service Catalog"
          title="Cennik usług"
          description="Fundament pod kalkulator wyceny, AI Concierge, oferty i faktury. Tutaj definiujemy, za co system ma liczyć cenę."
        >
          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadServices}
            disabled={loading}
          >
            Odśwież
          </PremiumButton>
          <PremiumButton href="/dashboard/quotes" variant="ghost">
            Oferty
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Wszystkie usługi"
            value={String(stats.total)}
            description="Łączna liczba pozycji w katalogu usług."
            trend="Źródło: Services API"
            tone="cyan"
            icon={<span className="text-lg font-black">SVC</span>}
          />

          <MetricCard
            title="Aktywne"
            value={String(stats.active)}
            description="Pozycje dostępne dla kalkulatora wyceny."
            trend={`Nieaktywne: ${stats.inactive}`}
            tone="emerald"
            icon={<span className="text-lg font-black">✓</span>}
          />

          <MetricCard
            title="Średnia cena"
            value={formatMoney(stats.averageBasePrice)}
            description="Średnia cena bazowa z katalogu usług."
            trend="Cena robocza"
            tone="amber"
            icon={<span className="text-lg font-black">CHF</span>}
          />

          <MetricCard
            title="Ryzyko"
            value={String(stats.highRisk)}
            description="Usługi z mnożnikiem ryzyka powyżej x1.00."
            trend="Do kontroli przy wycenie"
            tone="violet"
            icon={<span className="text-lg font-black">AI</span>}
          />
        </section>

        {loading ? (
          <DashboardPanel
            title="Ładowanie cennika"
            description="HEXA OS pobiera aktualny katalog usług."
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
            title="Błąd modułu Services"
            description="Nie udało się pobrać katalogu usług z API."
          >
            <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-red-100">
              <p className="font-bold">Błąd: {errorMessage}</p>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Sprawdź endpoint /api/dashboard/services, Prisma Client oraz
                połączenie z bazą.
              </p>
            </div>
          </DashboardPanel>
        ) : null}

        {!loading && !errorMessage ? (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <DashboardPanel
              title="Lista usług"
              description={`Liczba rekordów: ${services.length}. Ten katalog będzie używany przez moduł wyceny i przyszłe Vision AI.`}
              action={
                <StatusBadge
                  status={services.length > 0 ? "ACCEPTED" : "PENDING"}
                  label={
                    services.length > 0 ? "Cennik aktywny" : "Brak pozycji"
                  }
                />
              }
            >
              <DashboardTable
                columns={columns}
                rows={services}
                getRowKey={(service) => service.id}
                empty={
                  <EmptyState
                    title="Brak usług w cenniku"
                    description="Dodamy teraz pierwsze pozycje cennika: sprzątanie, okna, Endreinigung, dojazd i usługi specjalne."
                    actionLabel="Wróć do overview"
                    actionHref="/dashboard"
                  />
                }
              />
            </DashboardPanel>

            <DashboardPanel
              title="Ostatnie usługi"
              description="Szybki podgląd najnowszych pozycji katalogu."
            >
              <ActivityTimeline
                items={latestServices}
                emptyTitle="Brak usług"
                emptyDescription="Po dodaniu cennika zobaczysz tutaj najnowsze pozycje."
              />
            </DashboardPanel>
          </section>
        ) : null}

        {!loading && !errorMessage ? (
          <DashboardPanel
            title="Rola Service Catalog"
            description="Ten moduł jest podstawą pod oficjalny silnik wyceny: AI może podpowiadać, ale cena ma wynikać z cennika, reguł i zatwierdzenia człowieka."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-black text-cyan-100">
                  Ceny bazowe
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                  Każda usługa ma jednostkę, cenę bazową, minimum i opcjonalny
                  limit maksymalny.
                </p>
              </div>

              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-sm font-black text-violet-100">
                  Ryzyko i zdjęcia
                </p>
                <p className="mt-2 text-sm leading-6 text-violet-100/70">
                  Później Vision AI oceni zdjęcia i zaproponuje mnożnik ryzyka,
                  ale nie zatwierdzi ceny samo.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-sm font-black text-emerald-100">
                  MM Digital Core
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                  Ten katalog jest przygotowany pod tenanty, czyli różne firmy z
                  własnym cennikiem.
                </p>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </section>
    </main>
  );
}