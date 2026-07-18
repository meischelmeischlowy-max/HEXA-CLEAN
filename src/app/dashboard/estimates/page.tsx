"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ActionStatusBadge from "../../../components/dashboard/ActionStatusBadge";
import PageHeader from "../../../components/dashboard/PageHeader";
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

function isLeadEstimate(estimate: Estimate) {
  return isQuickOfferEstimate(estimate) || isChatbotEstimate(estimate);
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
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-none flex-col gap-5">
        <PageHeader
          eyebrow="HEXA OS CRM / Kalkulationen"
          title="Kalkulationen"
          description="Interne Arbeitsliste fuer Preisberechnung, Risiko, Fotos, AI-Pruefung und Freigabe. Aus einer fertigen Kalkulation entsteht erst danach eine Offerte."
        >
          <PremiumButton href="/dashboard/estimates/new" variant="primary">
            Neue Kalkulation
          </PremiumButton>

          <PremiumButton
            type="button"
            variant="secondary"
            onClick={loadEstimates}
            disabled={isLoading}
          >
            Aktualisieren
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Kalkulationen
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {totals.count}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/70">
              Summe
            </p>
            <p className="mt-2 text-2xl font-black text-cyan-100">
              {formatMoney(totals.totalValue, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/70">
              Pruefung
            </p>
            <p className="mt-2 text-2xl font-black text-amber-100">
              {totals.reviewCount}
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
              Bereit fuer Offerte
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-100">
              {totals.readyCount}
            </p>
          </div>

          <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200/70">
              QuickOffer
            </p>
            <p className="mt-2 text-2xl font-black text-fuchsia-100">
              {totals.quickOfferCount}
            </p>
          </div>

          <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200/70">
              Chatbot
            </p>
            <p className="mt-2 text-2xl font-black text-violet-100">
              {totals.chatbotCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/80">
            Prozessregel
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-100">
            Kalkulationen sind intern. QuickOffer- und Chatbot-Daten sind keine
            verbindliche Offerte. Erst pruefen, dann auf READY_TO_SEND setzen,
            dann Offerte vorbereiten.
          </p>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Kalkulationsliste
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Status anklicken oder Kalkulation oeffnen. Angebot, Rechnung und
                Zahlung werden nicht auf dieser Liste bearbeitet.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="p-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-neutral-400">
                Kalkulationen werden geladen...
              </div>
            </div>
          ) : null}

          {!isLoading && estimates.length === 0 ? (
            <div className="p-5">
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
                Keine Kalkulationen vorhanden. Erstellen Sie eine neue
                Kalkulation oder warten Sie auf QuickOffer-/Chatbot-Anfragen.
              </div>
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
                    className={`grid gap-4 px-5 py-4 transition lg:grid-cols-[minmax(220px,1.2fr)_minmax(150px,0.8fr)_minmax(220px,1fr)_minmax(180px,0.9fr)_minmax(130px,0.6fr)_auto] lg:items-center ${rowClass(
                      estimate,
                    )}`}
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/estimates/${estimate.id}`}
                        className="block truncate text-base font-black text-cyan-200 transition hover:text-cyan-100"
                      >
                        {estimate.estimateNumber ?? estimate.id}
                      </Link>

                      <p className="mt-1 truncate text-sm text-zinc-500">
                        {estimate.title ?? "Interne Kalkulation"}
                      </p>

                      {isLeadEstimate(estimate) ? (
                        <p className="mt-2 w-fit rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-bold text-zinc-300">
                          Website Lead
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${sourceBadgeClass(
                          estimate.source,
                        )}`}
                      >
                        {sourceLabel(estimate.source)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {customerName(estimate.customer)}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {customerContact(estimate.customer)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <ActionStatusBadge
                        href={`/dashboard/estimates/${estimate.id}`}
                        tone={action.tone}
                        label={action.label}
                        title={action.description}
                      />
                      <p className="text-xs text-zinc-500">
                        {formatDate(estimate.createdAt)}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="font-black text-zinc-100">
                        {formatMoney(
                          estimate.total,
                          estimate.currency ?? "CHF",
                        )}
                      </p>

                      {estimate.aiMinTotal || estimate.aiMaxTotal ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          AI:{" "}
                          {formatMoney(
                            estimate.aiMinTotal,
                            estimate.currency ?? "CHF",
                          )}{" "}
                          -{" "}
                          {formatMoney(
                            estimate.aiMaxTotal,
                            estimate.currency ?? "CHF",
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex justify-start lg:justify-end">
                      <Link
                        href={`/dashboard/estimates/${estimate.id}`}
                        className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/20"
                      >
                        Oeffnen
                      </Link>
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