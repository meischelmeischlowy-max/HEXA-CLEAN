"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkInvoiceAsSentButtonProps = {
  invoiceId: string;
};

type ApiResponse = {
  status?: string;
  message?: string;
  invoice?: {
    id: string;
    status: string;
  } | null;
  data?: {
    status?: string;
    message?: string;
    invoice?: {
      id: string;
      status: string;
    } | null;
  };
};

export default function MarkInvoiceAsSentButton({
  invoiceId,
}: MarkInvoiceAsSentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMarkAsSent() {
    const confirmed = window.confirm(
      "Möchten Sie diese Rechnung wirklich als versendet markieren?"
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          status: "SENT",
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        result.status === "ERROR" ||
        result.data?.status === "error"
      ) {
        setError(
          result.data?.message ??
            result.message ??
            "Die Rechnung konnte nicht als versendet markiert werden."
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Verbindungsfehler zur API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleMarkAsSent}
        disabled={isLoading}
        className="rounded-xl border border-sky-600 bg-sky-950/50 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Wird markiert..." : "Als versendet markieren"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}