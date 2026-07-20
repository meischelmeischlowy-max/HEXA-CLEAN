"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarkInvoiceAsSentButtonProps = {
  invoiceId: string;
};

type InvoiceUpdateResponse = {
  message?: string;
  data?: {
    status?: string;
    message?: string;
    invoice?: {
      id?: string;
      status?: string;
      sentAt?: string | null;
    } | null;
  };
};

export default function MarkInvoiceAsSentButton({
  invoiceId,
}: MarkInvoiceAsSentButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function markAsSent() {
    if (isLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Bestätigen Sie, dass die Rechnung an den Kunden versendet wurde.",
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/invoices/${invoiceId}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "SENT",
          }),
        },
      );

      const result = (await response
        .json()
        .catch(() => null)) as InvoiceUpdateResponse | null;

      const updatedInvoice = result?.data?.invoice;

      if (
        !response.ok ||
        result?.data?.status !== "success" ||
        updatedInvoice?.status !== "SENT"
      ) {
        setError(
          result?.data?.message ||
            result?.message ||
            "Die Rechnung konnte nicht als versendet markiert werden.",
        );

        return;
      }

      router.refresh();
    } catch {
      setError("Verbindungsfehler zur Rechnungs-API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={markAsSent}
        disabled={isLoading}
        className="h-full min-h-14 rounded-2xl border border-violet-300/30 bg-violet-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-violet-100 transition hover:border-violet-200 hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Wird aktualisiert..."
          : "Als gesendet markieren"}
      </button>

      {error ? (
        <p className="text-xs leading-5 text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
