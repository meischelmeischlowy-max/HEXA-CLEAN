"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateQuoteFromOrderButtonProps = {
  orderId: string;
};

export default function CreateQuoteFromOrderButton({
  orderId,
}: CreateQuoteFromOrderButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateQuote() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/orders/${orderId}/create-quote`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK" || !result.quoteId) {
        setError("Das Angebot konnte nicht erstellt werden.");
        return;
      }

      router.push(`/dashboard/quotes/${result.quoteId}`);
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
        onClick={handleCreateQuote}
        disabled={isLoading}
        className="rounded-xl border border-cyan-600 bg-cyan-950/50 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Angebot wird erstellt..." : "Angebot erstellen"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}