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
    invoice?: {
      id: string;
    } | null;
  };
};

const statusOptions: StatusOption[] = [
  {
    value: "DRAFT",
    label: "Entwurf",
    description: "Die Kalkulation wird noch vorbereitet.",
  },
  {
    value: "READY_TO_SEND",
    label: "Bereit zum Senden",
    description: "Der Eigentümer hat den Arbeitspreis akzeptiert.",
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
];

export default function EstimateStatusActions({
  estimateId,
  currentStatus,
}: EstimateStatusActionsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreateInvoice = ["READY_TO_SEND", "SENT", "ACCEPTED"].includes(
    currentStatus
  );

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
      const response = await fetch(
        `/api/dashboard/estimates/${estimateId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await parseApiResponse(response);

      if (!response.ok || data.data?.status === "error") {
        throw new Error(
          data.data?.message ?? data.message ?? "Der Status konnte nicht geändert werden."
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
          data.data?.message ?? data.message ?? "Die Rechnung konnte nicht erstellt werden."
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
          <h2 className="text-xl font-semibold">Statusänderung</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Der Status steuert den Verlauf der Kalkulation: Entwurf, bereit,
            versendet, akzeptiert oder abgelehnt.
          </p>
        </div>

        <button
          type="button"
          onClick={createInvoice}
          disabled={!canCreateInvoice || isCreatingInvoice}
          className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-neutral-500"
        >
          {isCreatingInvoice ? "Erstellen..." : "Rechnung erstellen"}
        </button>
      </div>

      {!canCreateInvoice ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Eine Rechnung kann erst aus einer bereiten, versendeten oder akzeptierten Kalkulation erstellt werden.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {statusOptions.map((option) => {
          const isActive = currentStatus === option.value;
          const isThisUpdating = isUpdating === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateStatus(option.value)}
              disabled={isUpdating.length > 0 || isActive || isCreatingInvoice}
              className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed ${
                isActive
                  ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                  : "border-white/10 bg-black/20 text-neutral-200 hover:border-cyan-300/30 hover:bg-cyan-300/10"
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