"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ActionStatusBadge from "../../../components/dashboard/ActionStatusBadge";
import PremiumButton from "../../../components/dashboard/PremiumButton";
import { getEstimateAction } from "../../../lib/dashboard/next-action";

type EstimateCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Estimate = {
  id: string;
  estimateNumber?: string | null;
  title?: string | null;
  status?: string | null;
  source?: string | null;
  currency?: string | null;
  total?: string | number | null;
  aiMinTotal?: string | number | null;
  aiMaxTotal?: string | number | null;
  serviceCity?: string | null;
  serviceStreet?: string | null;
  serviceZipCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: EstimateCustomer | null;
};

type EstimatesResponse = {
  layer?: string;
  message?: string;
  data?: {
    status?: string;
    message?: string;
    estimates?: Estimate[];
  };
  estimates?: Estimate[];
};

function normalizeCurrency(value?: string | null) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;
  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function toNumber(value: unknown) {
  const number = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: unknown, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function customerName(customer?: EstimateCustomer | null) {
  if (!customer) return "Kein Kunde";

  if (customer.companyName) return customer.companyName;

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "Kein Kunde";
}

function customerContact(customer?: EstimateCustomer | null) {
  if (!customer) return "Kein Kontakt";
  return customer.email || customer.phone || "Kein Kontakt";
}

function sourceLabel(source?: string | null) {
  const labels: Record<string, string> = {
    QUICK_OFFER: "QuickOffer",
    CHATBOT: "Chatbot",
    ADMIN: "Dashboard",
    PUBLIC_FORM: "Public Form",
    IMPORT: "Import",
  };

  if (!source) return "Unbekannt";

  return labels[String(source).toUpperCase()] ?? source;
}

function sourceBadgeClass(source?: string | null) {
  const normalized = String(source ?? "").toUpperCase();

  if (normalized === "QUICK_OFFER") {
    return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  }

  if (normalized === "CHATBOT") {
    return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  }

  if (normalized === "ADMIN") {
    return "border-neutral-300/20 bg-white/[0.06] text-neutral-200";
  }

  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

function isQuickOfferEstimate(estimate: Estimate) {
  return String(estimate.source ?? "").toUpperCase() === "QUICK_OFFER";
}

function isChatbotEstimate(estimate: Estimate) {
  return String(estimate.source ?? "").toUpperCase() === "CHATBOT";
}


function isReviewStatus(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();

  return (
    normalized === "AI_REVIEW" ||
    normalized === "NEEDS_PHOTOS" ||
    normalized === "NEEDS_HUMAN_REVIEW"
  );
}

function isReadyStatus(status?: string | null) {
  return String(status ?? "").toUpperCase() === "READY_TO_SEND";
}

function getEstimatesFromResponse(response: EstimatesResponse): Estimate[] {
  if (Array.isArray(response.data?.estimates)) {
    return response.data.estimates;
  }

  if (Array.isArray(response.estimates)) {
    return response.estimates;
  }

  return [];
}

function rowClass(estimate: Estimate) {
  if (isQuickOfferEstimate(estimate)) {
    return "bg-fuchsia-300/[0.035] hover:bg-fuchsia-300/[0.07]";
  }

  if (isChatbotEstimate(estimate)) {
    return "bg-violet-300/[0.035] hover:bg-violet-300/[0.07]";
  }

  return "hover:bg-white/[0.03]";
}

export default function DashboardEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const totalValue = estimates.reduce((sum, estimate) => {
      return sum + toNumber(estimate.total);
    }, 0);

    return {
      count: estimates.length,
      totalValue,
      reviewCount: estimates.filter((estimate) =>
        isReviewStatus(estimate.status),
      ).length,
      readyCount: estimates.filter((estimate) =>
        isReadyStatus(estimate.status),
      ).length,
      quickOfferCount: estimates.filter(isQuickOfferEstimate).length,
      chatbotCount: estimates.filter(isChatbotEstimate).length,
    };
  }, [estimates]);

  async function loadEstimates() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as EstimatesResponse;

      if (!response.ok) {
        throw new Error(
          data.message ??
            data.data?.message ??
            "Die Kalkulationen konnten nicht geladen werden.",
        );
      }

      setEstimates(getEstimatesFromResponse(data));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Laden der Kalkulationen.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEstimates();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Kalkulationen
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Kalkulationen
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Interne Preisprüfung. Pro Kalkulation genau der nächste erforderliche Schritt.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadEstimates}
                disabled={isLoading}
              >
                Aktualisieren
              </PremiumButton>

              <PremiumButton
                href="/dashboard/estimates/new"
                variant="primary"
                size="sm"
              >
                Neue Kalkulation
              </PremiumButton>
            </div>
          </div>

          <div
            data-testid="estimates-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {totals.count} gesamt
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {formatMoney(totals.totalValue, "CHF")}
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {totals.reviewCount} prüfen
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {totals.readyCount} bereit
            </span>

            <span className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-fuchsia-100">
              {totals.quickOfferCount} QuickOffer
            </span>

            <span className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100">
              {totals.chatbotCount} Chatbot
            </span>
          </div>
        </header>

        {error ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {error}
          </section>
        ) : null}

        <section
          data-testid="estimates-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Aktive Kalkulationen
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                QuickOffer und Chatbot bleiben interne Anfragen, bis die Kalkulation geprüft wurde.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {estimates.length} Positionen
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {!isLoading && estimates.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Kalkulationen vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Neue QuickOffer-, Chatbot- oder manuelle Anfragen erscheinen automatisch.
              </p>
            </div>
          ) : null}

          {!isLoading && estimates.length > 0 ? (
            <div className="divide-y divide-white/10">
              {estimates.map((estimate) => {
                const action = getEstimateAction({
                  id: estimate.id,
                  status: estimate.status,
                });

                return (
                  <article
                    key={estimate.id}
                    className={`grid gap-2 px-3 py-2.5 transition xl:grid-cols-[minmax(190px,0.9fr)_110px_minmax(210px,1fr)_minmax(170px,0.8fr)_140px_auto] xl:items-center ${rowClass(
                      estimate,
                    )}`}
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/estimates/${estimate.id}`}
                        className="block truncate text-sm font-black text-cyan-100 transition hover:text-white"
                      >
                        {estimate.estimateNumber ?? estimate.id}
                      </Link>

                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {estimate.title ?? "Interne Kalkulation"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <span
                        className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${sourceBadgeClass(
                          estimate.source,
                        )}`}
                      >
                        {sourceLabel(estimate.source)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-zinc-100">
                        {customerName(estimate.customer)}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {customerContact(estimate.customer)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-zinc-100">
                        {formatMoney(
                          estimate.total,
                          estimate.currency ?? "CHF",
                        )}
                      </p>

                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {formatDate(estimate.createdAt)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      {estimate.aiMinTotal || estimate.aiMaxTotal ? (
                        <p className="truncate text-[11px] font-bold text-zinc-400">
                          AI{" "}
                          {formatMoney(
                            estimate.aiMinTotal,
                            estimate.currency ?? "CHF",
                          )}{" "}
                          –{" "}
                          {formatMoney(
                            estimate.aiMaxTotal,
                            estimate.currency ?? "CHF",
                          )}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-600">
                          Keine AI-Spanne
                        </p>
                      )}
                    </div>

                    <div className="xl:text-right">
                      <ActionStatusBadge
                        href={`/dashboard/estimates/${estimate.id}`}
                        tone={action.tone}
                        label={action.label}
                        title={action.description}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}