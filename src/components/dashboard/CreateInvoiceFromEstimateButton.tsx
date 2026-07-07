"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateInvoiceResponse = {
  layer?: string;
  message?: string;
  data?: {
    status?: string;
    message?: string;
    created?: boolean;
    invoice?: {
      id: string;
      invoiceNumber?: string | null;
    } | null;
  };
};

export default function CreateInvoiceFromEstimateButton({
  estimateId,
}: {
  estimateId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createInvoice() {
    const confirmed = window.confirm(
      "Rechnung wirklich aus dieser akzeptierten Kalkulation erstellen?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/estimates/${estimateId}/invoice`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const json = (await response.json()) as CreateInvoiceResponse;

      if (!response.ok || json.data?.status === "error") {
        throw new Error(
          json.data?.message ??
            json.message ??
            "Die Rechnung konnte nicht erstellt werden."
        );
      }

      const invoiceId = json.data?.invoice?.id;

      if (!invoiceId) {
        throw new Error("Die API hat keine Rechnungs-ID zurückgegeben.");
      }

      router.push(`/dashboard/invoices/${invoiceId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Rechnung."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={createInvoice}
        disabled={loading}
        className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Rechnung wird erstellt..."
          : "Rechnung aus akzeptierter Kalkulation erstellen"}
      </button>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}