"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkOrderAsCompletedButtonProps = {
  orderId: string;
};

export default function MarkOrderAsCompletedButton({
  orderId,
}: MarkOrderAsCompletedButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMarkAsCompleted() {
    const confirmed = window.confirm(
      "Czy na pewno oznaczyć to zlecenie jako zakończone?"
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/orders/${orderId}/mark-completed`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK") {
        setError("Nie udało się oznaczyć zlecenia jako zakończonego.");
        return;
      }

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
        onClick={handleMarkAsCompleted}
        disabled={isLoading}
        className="rounded-xl border border-orange-600 bg-orange-950/50 px-4 py-3 text-sm font-semibold text-orange-100 transition hover:border-orange-300 hover:bg-orange-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Oznaczam..." : "Oznacz jako zakończone"}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}