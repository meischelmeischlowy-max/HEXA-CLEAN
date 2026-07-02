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
    label: "Robocza",
    description: "Wycena jest jeszcze przygotowywana.",
  },
  {
    value: "READY_TO_SEND",
    label: "Gotowa do wysłania",
    description: "Właściciel zaakceptował roboczą cenę.",
  },
  {
    value: "SENT",
    label: "Wysłana",
    description: "Oferta została wysłana klientowi.",
  },
  {
    value: "ACCEPTED",
    label: "Zaakceptowana",
    description: "Klient zaakceptował wycenę.",
  },
  {
    value: "REJECTED",
    label: "Odrzucona",
    description: "Klient odrzucił wycenę.",
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
        `API zwróciło pustą odpowiedź. HTTP status: ${response.status}`
      );
    }

    try {
      return JSON.parse(rawText) as ApiResponse;
    } catch {
      throw new Error(
        `API nie zwróciło JSON. HTTP status: ${
          response.status
        }. Odpowiedź: ${rawText.slice(0, 300)}`
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
          data.data?.message ?? data.message ?? "Nie udało się zmienić statusu."
        );
      }

      setMessage(data.data?.message ?? "Status został zmieniony.");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd zmiany statusu."
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
          data.data?.message ?? data.message ?? "Nie udało się utworzyć faktury."
        );
      }

      const invoiceId = data.data?.invoice?.id;

      if (!invoiceId) {
        throw new Error("API nie zwróciło ID faktury.");
      }

      router.push(`/dashboard/invoices/${invoiceId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd tworzenia faktury."
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Zmiana statusu</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Status steruje etapem wyceny: robocza, gotowa, wysłana,
            zaakceptowana albo odrzucona.
          </p>
        </div>

        <button
          type="button"
          onClick={createInvoice}
          disabled={!canCreateInvoice || isCreatingInvoice}
          className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-neutral-500"
        >
          {isCreatingInvoice ? "Tworzenie..." : "Utwórz fakturę"}
        </button>
      </div>

      {!canCreateInvoice ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Fakturę można utworzyć dopiero z wyceny gotowej, wysłanej albo
          zaakceptowanej.
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
                {isThisUpdating ? "Zapisywanie..." : option.description}
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