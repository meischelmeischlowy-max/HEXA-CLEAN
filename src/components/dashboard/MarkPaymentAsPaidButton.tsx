"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkPaymentAsPaidButtonProps = {
  paymentId: string;
};

export default function MarkPaymentAsPaidButton({
  paymentId,
}: MarkPaymentAsPaidButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMarkAsPaid() {
    const confirmed = window.confirm(
      "Czy na pewno oznaczyć tę płatność jako opłaconą?"
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/payments/${paymentId}/mark-paid`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK") {
        setError("Nie udało się oznaczyć płatności jako opłaconej.");
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
        onClick={handleMarkAsPaid}
        disabled={isLoading}
        className="rounded-xl border border-green-600 bg-green-950/50 px-4 py-3 text-sm font-semibold text-green-100 transition hover:border-green-300 hover:bg-green-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Oznaczam..." : "Oznacz jako opłacone"}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}