"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

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

function toNumber(
  value?: string | number | null,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isNaN(value)
      ? null
      : value;
  }

  const parsed = Number(
    String(value).replace(
      ",",
      ".",
    ),
  );

  return Number.isNaN(parsed)
    ? null
    : parsed;
}

function formatMoney(
  value?: string | number | null,
) {
  const numberValue =
    toNumber(value);

  if (
    numberValue === null
  ) {
    return "Kein Preis";
  }

  return new Intl.NumberFormat(
    "de-CH",
    {
      style: "currency",
      currency: "CHF",
      maximumFractionDigits: 2,
    },
  ).format(numberValue);
}

function formatDecimal(
  value?: string | number | null,
) {
  const numberValue =
    toNumber(value);

  if (
    numberValue === null
  ) {
    return "–";
  }

  return new Intl.NumberFormat(
    "de-CH",
    {
      maximumFractionDigits: 2,
    },
  ).format(numberValue);
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Kein Datum";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Kein Datum";
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Zurich",
    },
  ).format(date);
}

function formatCategory(
  category?: string | null,
) {
  if (!category) {
    return "Keine Kategorie";
  }

  const labels: Record<
    string,
    string
  > = {
    REINIGUNG: "Reinigung",
    HAUSWARTUNG: "Hauswartung",
    KLEINREPARATUREN:
      "Kleinreparaturen",
    UMZUGSREINIGUNG:
      "Umzugsreinigung",
    FENSTERREINIGUNG:
      "Fensterreinigung",
    WOHNUNGSABGABE:
      "Wohnungsabgabe",
    SPEZIALREINIGUNG:
      "Spezialreinigung",
    OTHER: "Sonstiges",
  };

  return (
    labels[
      category.toUpperCase()
    ] ?? category
  );
}

function formatUnit(
  unit?: string | null,
) {
  if (!unit) {
    return "Keine Einheit";
  }

  const labels: Record<
    string,
    string
  > = {
    FLAT: "Pauschal",
    HOUR: "Stunde",
    M2: "m²",
    ROOM: "Zimmer",
    WINDOW: "Fenster",
    PIECE: "Stück",
    KM: "Kilometer",
    CUSTOM: "Eigene Einheit",
  };

  return (
    labels[
      unit.toUpperCase()
    ] ?? unit
  );
}

function statusLabel(
  service: ServiceCatalogItem,
) {
  return service.isActive
    ? "Aktiv"
    : "Inaktiv";
}

function statusClasses(
  service: ServiceCatalogItem,
) {
  return service.isActive
    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    : "border-zinc-600/40 bg-zinc-700/20 text-zinc-300";
}

function servicePriority(
  service: ServiceCatalogItem,
) {
  return service.isActive
    ? 0
    : 1;
}

function serviceTimestamp(
  service: ServiceCatalogItem,
) {
  const value =
    service.updatedAt ??
    service.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

export default function DashboardServicesPage() {
  const [
    services,
    setServices,
  ] = useState<
    ServiceCatalogItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  const loadServices =
    useCallback(
      async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
          const response =
            await fetch(
              "/api/dashboard/services",
              {
                method: "GET",
                cache: "no-store",
                credentials:
                  "include",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Das Leistungsverzeichnis konnte nicht geladen werden.",
            );
          }

          const json =
            (await response.json()) as DashboardServicesResponse;

          setServices(
            json.data
              ?.services ??
              [],
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Das Leistungsverzeichnis konnte nicht geladen werden.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadServices();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadServices]);

  const sortedServices =
    useMemo(() => {
      return [
        ...services,
      ].sort(
        (
          left,
          right,
        ) => {
          const priorityDifference =
            servicePriority(
              left,
            ) -
            servicePriority(
              right,
            );

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          const sortDifference =
            (left.sortOrder ?? 0) -
            (right.sortOrder ?? 0);

          if (
            sortDifference !== 0
          ) {
            return sortDifference;
          }

          return (
            serviceTimestamp(
              right,
            ) -
            serviceTimestamp(
              left,
            )
          );
        },
      );
    }, [services]);

  const stats =
    useMemo(() => {
      const active =
        services.filter(
          (service) =>
            service.isActive,
        ).length;

      const inactive =
        services.length -
        active;

      const highRisk =
        services.filter(
          (service) =>
            (
              toNumber(
                service.riskMultiplier,
              ) ?? 1
            ) > 1,
        ).length;

      return {
        active,
        inactive,
        highRisk,
      };
    }, [services]);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Leistungen
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Leistungsverzeichnis
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Preise und Kalkulationsgrundlagen für Angebote und Rechnungen.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={
                  loadServices
                }
                disabled={loading}
              >
                Aktualisieren
              </PremiumButton>

              <PremiumButton
                href="/dashboard/services/new"
                variant="primary"
                size="sm"
              >
                Leistung hinzufügen
              </PremiumButton>
            </div>
          </div>

          <div
            data-testid="services-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {services.length} gesamt
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.active} aktiv
            </span>

            <span className="rounded-lg border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {stats.inactive} inaktiv
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.highRisk} erhöhtes Risiko
            </span>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {errorMessage}
          </section>
        ) : null}

        <section
          data-testid="services-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Leistungskatalog
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Aktive Leistungen stehen zuerst.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedServices.length} Positionen
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedServices.length ===
            0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Leistungen vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Erstellen Sie die erste Leistung für das Kalkulationssystem.
              </p>

              <div className="mt-4">
                <PremiumButton
                  href="/dashboard/services/new"
                  variant="primary"
                  size="sm"
                >
                  Leistung hinzufügen
                </PremiumButton>
              </div>
            </div>
          ) : null}

          {!loading &&
          !errorMessage &&
          sortedServices.length >
            0 ? (
            <div className="divide-y divide-white/10">
              {sortedServices.map(
                (
                  service,
                ) => (
                  <article
                    key={service.id}
                    className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[minmax(240px,1.2fr)_150px_120px_minmax(210px,0.9fr)_120px_150px_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cyan-100">
                        {service.name}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {service.description ||
                          "Keine Beschreibung"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Kategorie
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-200">
                        {formatCategory(
                          service.category,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Einheit
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-200">
                        {formatUnit(
                          service.unit,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Preis
                      </p>

                      <p className="mt-0.5 truncate text-xs font-black text-emerald-100">
                        {formatMoney(
                          service.basePrice,
                        )}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                        Min. {formatMoney(
                          service.minPrice,
                        )} · Max. {formatMoney(
                          service.maxPrice,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClasses(
                          service,
                        )}`}
                      >
                        {statusLabel(
                          service,
                        )}
                      </span>

                      <p className="mt-1 truncate text-[10px] text-zinc-600">
                        Risiko x{formatDecimal(
                          service.riskMultiplier,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                        Aktualisiert
                      </p>

                      <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                        {formatDate(
                          service.updatedAt ??
                            service.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="xl:text-right">
                      <PremiumButton
                        href={`/dashboard/services/${service.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Leistung öffnen
                      </PremiumButton>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}