"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreatePaymentFromInvoiceButtonProps = {
  invoiceId: string;
};

export default function CreatePaymentFromInvoiceButton({
  invoiceId,
}: CreatePaymentFromInvoiceButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreatePayment() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/invoices/${invoiceId}/create-payment`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok || result.status !== "OK" || !result.paymentId) {
        setError("Die Zahlung konnte nicht erstellt werden.");
        return;
      }

      router.push(`/dashboard/payments/${result.paymentId}`);
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
        onClick={handleCreatePayment}
        disabled={isLoading}
        className="rounded-xl border border-violet-600 bg-violet-950/50 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:border-violet-300 hover:bg-violet-900/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Zahlung wird erstellt..." : "Zahlung erfassen"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}