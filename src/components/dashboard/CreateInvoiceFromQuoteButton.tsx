"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateInvoiceFromQuoteButtonProps = {
  quoteId: string;
};

export default function CreateInvoiceFromQuoteButton({
  quoteId,
}: CreateInvoiceFromQuoteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateInvoice() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/create-invoice`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK" || !result.invoiceId) {
        setError("Nie udało się utworzyć faktury.");
        return;
      }

      router.push(`/dashboard/invoices/${result.invoiceId}`);
      router.refresh();
    } catch {
      setError("Błąd połączenia z API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleCreateInvoice}
        disabled={isLoading}
        className="rounded-xl border border-emerald-600 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Tworzę fakturę..." : "Utwórz fakturę"}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}