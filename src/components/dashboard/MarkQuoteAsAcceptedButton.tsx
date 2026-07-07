"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkQuoteAsAcceptedButtonProps = {
  quoteId: string;
};

export default function MarkQuoteAsAcceptedButton({
  quoteId,
}: MarkQuoteAsAcceptedButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMarkAsAccepted() {
    const confirmed = window.confirm(
      "Dieses Angebot wirklich als angenommen markieren?",
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/mark-accepted`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK") {
        setError("Das Angebot konnte nicht als angenommen markiert werden.");
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
        onClick={handleMarkAsAccepted}
        disabled={isLoading}
        className="rounded-xl border border-lime-600 bg-lime-950/50 px-4 py-3 text-sm font-semibold text-lime-100 transition hover:border-lime-300 hover:bg-lime-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Wird gespeichert..." : "Als angenommen markieren"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}