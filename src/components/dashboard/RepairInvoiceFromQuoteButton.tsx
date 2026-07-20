"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RepairInvoiceFromQuoteButtonProps = {
  quoteId: string;
  invoiceId: string;
};

type RepairResponse = {
  status?: string;
  message?: string;
  invoiceId?: string;
  repaired?: boolean;
};

export default function RepairInvoiceFromQuoteButton({
  quoteId,
  invoiceId,
}: RepairInvoiceFromQuoteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function repairInvoice() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/create-invoice`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      const result = (await response
        .json()
        .catch(() => null)) as RepairResponse | null;

      if (
        !response.ok ||
        result?.status !== "OK" ||
        !result.invoiceId
      ) {
        setError(
          result?.message ||
            "Die Rechnung konnte nicht repariert werden.",
        );
        return;
      }

      setMessage(
        result.repaired
          ? "Rechnung wurde repariert."
          : "Rechnung war bereits vollständig.",
      );

      router.push(
        `/dashboard/invoices/${result.invoiceId || invoiceId}`,
      );
      router.refresh();
    } catch {
      setError("Verbindungsfehler zur API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={repairInvoice}
        disabled={isLoading}
        className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Rechnung wird geprüft..."
          : "Rechnung reparieren"}
      </button>

      {message ? (
        <p className="text-xs text-emerald-300">{message}</p>
      ) : null}

      {error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
