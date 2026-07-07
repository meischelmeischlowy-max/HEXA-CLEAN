"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  subtotal?: string | number | null;
  riskAmount?: string | number | null;
  travelFee?: string | number | null;
  discountAmount?: string | number | null;
  total?: string | number | null;
  aiMinTotal?: string | number | null;
  aiMaxTotal?: string | number | null;
  serviceCity?: string | null;
  serviceStreet?: string | null;
  serviceZipCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: EstimateCustomer | null;
  items?: unknown[];
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

function formatMoney(value: string | number | null | undefined, currency = "CHF") {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function customerName(customer?: EstimateCustomer | null) {
  if (!customer) {
    return "Demo-Kunde";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || "Demo-Kunde";
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    DRAFT: "Entwurf",
    AI_REVIEW: "KI-Prüfung",
    NEEDS_PHOTOS: "Fotos erforderlich",
    NEEDS_HUMAN_REVIEW: "Prüfung durch Inhaber",
    READY_TO_SEND: "Versandbereit",
    SENT: "Versendet",
    ACCEPTED: "Akzeptiert",
    REJECTED: "Abgelehnt",
    EXPIRED: "Abgelaufen",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function sourceLabel(source?: string | null) {
  const labels: Record<string, string> = {
    QUICK_OFFER: "QuickOffer",
    ADMIN: "Dashboard",
    CHATBOT: "Chatbot",
    PUBLIC_FORM: "Public Form",
    IMPORT: "Import",
  };

  if (!source) {
    return "Unbekannt";
  }

  return labels[source] ?? source;
}

function isQuickOfferEstimate(estimate: Estimate) {
  return String(estimate.source ?? "").toUpperCase() === "QUICK_OFFER";
}

function isAiReviewEstimate(estimate: Estimate) {
  return String(estimate.status ?? "").toUpperCase() === "AI_REVIEW";
}

function statusBadgeClass(status?: string | null) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  if (normalizedStatus === "AI_REVIEW") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (normalizedStatus === "READY_TO_SEND") {
    return "border-lime-300/25 bg-lime-300/10 text-lime-100";
  }

  if (normalizedStatus === "SENT") {
    return "border-sky-300/25 bg-sky-300/10 text-sky-100";
  }

  if (normalizedStatus === "ACCEPTED") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (normalizedStatus === "REJECTED" || normalizedStatus === "EXPIRED") {
    return "border-red-300/25 bg-red-300/10 text-red-100";
  }

  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
}

function sourceBadgeClass(source?: string | null) {
  const normalizedSource = String(source ?? "").toUpperCase();

  if (normalizedSource === "QUICK_OFFER") {
    return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  }

  if (normalizedSource === "CHATBOT") {
    return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  }

  if (normalizedSource === "ADMIN") {
    return "border-neutral-300/20 bg-white/[0.06] text-neutral-200";
  }

  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
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

export default function DashboardEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const totalValue = estimates.reduce((sum, estimate) => {
      const value = Number(estimate.total ?? 0);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);

    const quickOfferCount = estimates.filter(isQuickOfferEstimate).length;
    const aiReviewCount = estimates.filter(isAiReviewEstimate).length;
    const quickOfferAiReviewCount = estimates.filter(
      (estimate) => isQuickOfferEstimate(estimate) && isAiReviewEstimate(estimate),
    ).length;

    return {
      count: estimates.length,
      totalValue,
      quickOfferCount,
      aiReviewCount,
      quickOfferAiReviewCount,
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

  async function createDemoEstimate() {
    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as EstimatesResponse;

      if (!response.ok) {
        throw new Error(
          data.message ??
            data.data?.message ??
            "Die Demo-Kalkulation konnte nicht erstellt werden.",
        );
      }

      await loadEstimates();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Kalkulation.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    void loadEstimates();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / Kalkulationen
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Kalkulationen
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Liste von manuellen Kalkulationen, QuickOffer-Leads und
                versendeten Angeboten. Einträge aus dem öffentlichen Formular
                werden als QuickOffer markiert und müssen vor Versand geprüft
                werden.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/estimates/new"
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-neutral-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200"
              >
                Neue Kalkulation
              </Link>

              <button
                type="button"
                onClick={createDemoEstimate}
                disabled={isCreating}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-neutral-100 shadow-lg shadow-black/20 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Wird erstellt..." : "Demo-Kalkulation hinzufügen"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Anzahl Kalkulationen</p>
            <p className="mt-2 text-3xl font-black">{totals.count}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-neutral-400">Gesamtsumme</p>
            <p className="mt-2 text-3xl font-black">
              {formatMoney(totals.totalValue, "CHF")}
            </p>
          </div>

          <div className="rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-5">
            <p className="text-sm text-fuchsia-100/70">QuickOffer Leads</p>
            <p className="mt-2 text-3xl font-black text-fuchsia-100">
              {totals.quickOfferCount}
            </p>
          </div>

          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm text-amber-100/70">Wymaga Prüfung</p>
            <p className="mt-2 text-3xl font-black text-amber-100">
              {totals.aiReviewCount}
            </p>
          </div>

          <div className="rounded-3xl border border-red-300/20 bg-red-300/10 p-5">
            <p className="text-sm text-red-100/70">QuickOffer do kontroli</p>
            <p className="mt-2 text-3xl font-black text-red-100">
              {totals.quickOfferAiReviewCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-100/80">
            Hinweis
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-100">
            QuickOffer ist nur eine orientierende Anfrage. Preise aus dem
            Formular dürfen nicht automatisch als verbindliche Kundenofferte
            gelten. Der Inhaber prüft den Umfang, Fotos, Risiko, Anfahrt und
            Material, bevor ein Angebot versendet wird.
          </p>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Kalkulationsliste</h2>
              <p className="mt-1 text-sm text-neutral-400">
                QuickOffer-Leads sind farblich markiert. Öffnen Sie Details, um
                den Umfang zu prüfen und daraus eine fertige Offerte zu machen.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/estimates/new"
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              >
                Neue Kalkulation
              </Link>

              <button
                type="button"
                onClick={loadEstimates}
                disabled={isLoading}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Aktualisieren..." : "Aktualisieren"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-neutral-400">
              Kalkulationen werden geladen...
            </div>
          ) : null}

          {!isLoading && estimates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-neutral-400">
              Keine Kalkulationen vorhanden. Klicken Sie auf „Neue Kalkulation“,
              um die erste manuelle Kalkulation zu erstellen, oder senden Sie
              testweise eine Anfrage über QuickOffer auf der Website.
            </div>
          ) : null}

          {!isLoading && estimates.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.18em] text-neutral-400">
                  <tr>
                    <th className="px-4 py-4">Nummer</th>
                    <th className="px-4 py-4">Quelle</th>
                    <th className="px-4 py-4">Kunde</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Ort</th>
                    <th className="px-4 py-4">Erstellt</th>
                    <th className="px-4 py-4 text-right">Gesamt</th>
                    <th className="px-4 py-4 text-right">Aktion</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {estimates.map((estimate) => {
                    const quickOffer = isQuickOfferEstimate(estimate);
                    const aiReview = isAiReviewEstimate(estimate);

                    return (
                      <tr
                        key={estimate.id}
                        className={
                          quickOffer
                            ? "bg-fuchsia-300/[0.035] hover:bg-fuchsia-300/[0.07]"
                            : "hover:bg-white/[0.03]"
                        }
                      >
                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/estimates/${estimate.id}`}
                            className="font-black text-cyan-300 hover:text-cyan-200"
                          >
                            {estimate.estimateNumber ?? estimate.id}
                          </Link>

                          <p className="mt-1 text-xs text-neutral-500">
                            {estimate.title ?? "Entwurfskalkulation"}
                          </p>

                          {quickOffer ? (
                            <p className="mt-2 w-fit rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-1 text-[11px] font-bold text-fuchsia-100">
                              Neuer Website-Lead
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${sourceBadgeClass(
                              estimate.source,
                            )}`}
                          >
                            {sourceLabel(estimate.source)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-neutral-300">
                          <p className="font-semibold text-neutral-100">
                            {customerName(estimate.customer)}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {estimate.customer?.email ??
                              estimate.customer?.phone ??
                              "Kein Kontakt"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                              estimate.status,
                            )}`}
                          >
                            {statusLabel(estimate.status)}
                          </span>

                          {aiReview ? (
                            <p className="mt-2 text-xs font-semibold text-amber-200">
                              Prüfen przed wysyłką
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-neutral-300">
                          {estimate.serviceCity ?? "—"}
                        </td>

                        <td className="px-4 py-4 text-neutral-300">
                          {formatDate(estimate.createdAt)}
                        </td>

                        <td className="px-4 py-4 text-right font-black text-neutral-100">
                          {formatMoney(estimate.total, estimate.currency ?? "CHF")}

                          {estimate.aiMinTotal || estimate.aiMaxTotal ? (
                            <p className="mt-1 text-xs font-normal text-neutral-500">
                              AI:{" "}
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
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/estimates/${estimate.id}`}
                              className={
                                quickOffer
                                  ? "rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-300/20"
                                  : "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-neutral-100 hover:bg-white/[0.08]"
                              }
                            >
                              {quickOffer ? "Lead prüfen" : "Details"}
                            </Link>

                            <Link
                              href={`/dashboard/estimates/${estimate.id}/offer`}
                              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                            >
                              Angebot
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}