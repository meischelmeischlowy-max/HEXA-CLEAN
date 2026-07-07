"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EstimateStatusActionsProps = {
  estimateId: string;
  currentStatus: string;
};

type StatusOption = {
  value: string;
  label: string;
  description: string;
};

type ApiResponse = {
  layer?: string;
  message?: string;
  data?: {
    status?: string;
    message?: string;
    updated?: boolean;
    created?: boolean;
    estimate?: {
      id: string;
      status: string;
    } | null;
    quote?: {
      id: string;
    } | null;
    invoice?: {
      id: string;
    } | null;
  };
};

const statusOptions: StatusOption[] = [
  {
    value: "READY_TO_SEND",
    label: "Bereit zum Senden",
    description: "Die Kalkulation ist geprüft und kann als Angebot vorbereitet werden.",
  },
  {
    value: "SENT",
    label: "Versendet",
    description: "Das Angebot wurde an den Kunden gesendet.",
  },
  {
    value: "ACCEPTED",
    label: "Akzeptiert",
    description: "Der Kunde hat die Kalkulation akzeptiert.",
  },
  {
    value: "REJECTED",
    label: "Abgelehnt",
    description: "Der Kunde hat die Kalkulation abgelehnt.",
  },
  {
    value: "EXPIRED",
    label: "Abgelaufen",
    description: "Die Kalkulation ist nicht mehr gültig.",
  },
];

export default function EstimateStatusActions({
  estimateId,
  currentStatus,
}: EstimateStatusActionsProps) {
  const router = useRouter();

  const [isUpdating, setIsUpdating] = useState("");
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreateQuote = ["READY_TO_SEND", "SENT", "ACCEPTED"].includes(
    currentStatus
  );

  const canCreateInvoice = currentStatus === "ACCEPTED";

  function canUseStatusAction(nextStatus: string) {
    if (currentStatus === nextStatus) {
      return false;
    }

    if (["ACCEPTED", "REJECTED", "EXPIRED"].includes(currentStatus)) {
      return false;
    }

    if (nextStatus === "READY_TO_SEND") {
      return [
        "DRAFT",
        "AI_REVIEW",
        "NEEDS_PHOTOS",
        "NEEDS_HUMAN_REVIEW",
      ].includes(currentStatus);
    }

    if (nextStatus === "SENT") {
      return currentStatus === "READY_TO_SEND";
    }

    if (nextStatus === "ACCEPTED" || nextStatus === "REJECTED") {
      return currentStatus === "SENT";
    }

    if (nextStatus === "EXPIRED") {
      return currentStatus !== "ACCEPTED";
    }

    return false;
  }

  async function parseApiResponse(response: Response) {
    const rawText = await response.text();

    if (!rawText.trim()) {
      throw new Error(
        `Die API hat eine leere Antwort zurückgegeben. HTTP-Status: ${response.status}`
      );
    }

    try {
      return JSON.parse(rawText) as ApiResponse;
    } catch {
      throw new Error(
        `Die API hat kein JSON zurückgegeben. HTTP-Status: ${
          response.status
        }. Antwort: ${rawText.slice(0, 300)}`
      );
    }
  }

  async function updateStatus(nextStatus: string) {
    setIsUpdating(nextStatus);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/dashboard/estimates/${estimateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok || data.data?.status === "error") {
        throw new Error(
          data.data?.message ??
            data.message ??
            "Der Status konnte nicht geändert werden."
        );
      }

      setMessage(data.data?.message ?? "Der Status wurde geändert.");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Ändern des Status."
      );
    } finally {
      setIsUpdating("");
    }
  }

  async function createQuote() {
    setIsCreatingQuote(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/estimates/${estimateId}/quote`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const data = await parseApiResponse(response);

      if (!response.ok || data.data?.status === "error") {
        throw new Error(
          data.data?.message ??
            data.message ??
            "Das Angebot konnte nicht erstellt werden."
        );
      }

      const quoteId = data.data?.quote?.id;

      if (!quoteId) {
        throw new Error("Die API hat keine Angebots-ID zurückgegeben.");
      }

      router.push(`/dashboard/quotes/${quoteId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen des Angebots."
      );
    } finally {
      setIsCreatingQuote(false);
    }
  }

  async function createInvoice() {
    setIsCreatingInvoice(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/estimates/${estimateId}/invoice`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const data = await parseApiResponse(response);

      if (!response.ok || data.data?.status === "error") {
        throw new Error(
          data.data?.message ??
            data.message ??
            "Die Rechnung konnte nicht erstellt werden."
        );
      }

      const invoiceId = data.data?.invoice?.id;

      if (!invoiceId) {
        throw new Error("Die API hat keine Rechnungs-ID zurückgegeben.");
      }

      router.push(`/dashboard/invoices/${invoiceId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Rechnung."
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Kalkulation Workflow</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Der Status folgt dem echten Prozess: prüfen, senden, akzeptieren,
            Angebot erstellen und erst danach Rechnung erstellen.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Aktueller Status: <span className="font-semibold">{currentStatus}</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={createQuote}
            disabled={!canCreateQuote || isCreatingQuote || isCreatingInvoice}
            className="rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-neutral-500"
          >
            {isCreatingQuote ? "Erstellen..." : "Angebot erstellen"}
          </button>

          <button
            type="button"
            onClick={createInvoice}
            disabled={!canCreateInvoice || isCreatingInvoice || isCreatingQuote}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-neutral-500"
          >
            {isCreatingInvoice ? "Erstellen..." : "Rechnung erstellen"}
          </button>
        </div>
      </div>

      {!canCreateQuote ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Ein Angebot kann erst aus einer bereiten, versendeten oder akzeptierten
          Kalkulation erstellt werden.
        </div>
      ) : null}

      {!canCreateInvoice ? (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Eine Rechnung kann erst aus einer akzeptierten Kalkulation erstellt
          werden.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {statusOptions.map((option) => {
          const isActive = currentStatus === option.value;
          const isThisUpdating = isUpdating === option.value;
          const isAllowed = canUseStatusAction(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateStatus(option.value)}
              disabled={
                isUpdating.length > 0 ||
                isActive ||
                isCreatingInvoice ||
                isCreatingQuote ||
                !isAllowed
              }
              className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed ${
                isActive
                  ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                  : isAllowed
                    ? "border-white/10 bg-black/20 text-neutral-200 hover:border-cyan-300/30 hover:bg-cyan-300/10"
                    : "border-white/5 bg-white/[0.02] text-neutral-600"
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-2 block text-xs leading-5 text-neutral-400">
                {isThisUpdating ? "Wird gespeichert..." : option.description}
              </span>
            </button>
          );
        })}
      </div>

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}