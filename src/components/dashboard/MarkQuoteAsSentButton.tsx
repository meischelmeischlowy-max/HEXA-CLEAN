"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkQuoteAsSentButtonProps = {
  quoteId: string;
};

export default function MarkQuoteAsSentButton({
  quoteId,
}: MarkQuoteAsSentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMarkAsSent() {
    const confirmed = window.confirm(
      "Dieses Angebot wirklich als gesendet markieren?",
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/mark-sent`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK") {
        setError("Das Angebot konnte nicht als gesendet markiert werden.");
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
        {isLoading ? "Wird gespeichert..." : "Als gesendet markieren"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}