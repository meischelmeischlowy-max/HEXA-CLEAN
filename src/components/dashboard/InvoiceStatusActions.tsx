"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoiceStatusActionsProps = {
  invoiceId: string;
  status: string;
  openAmount: number;
  currency: string;
};

function formatMoney(value: number, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(value);
}

function invoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Robocza",
    SENT: "Wysłana",
    PARTIALLY_PAID: "Częściowo opłacona",
    PAID: "Opłacona",
    OVERDUE: "Po terminie",
    CANCELLED: "Anulowana",
  };

  return labels[status] ?? status;
}

export default function InvoiceStatusActions({
  invoiceId,
  status,
  openAmount,
  currency,
}: InvoiceStatusActionsProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDraft = status === "DRAFT";
  const isSent = status === "SENT";
  const isPartiallyPaid = status === "PARTIALLY_PAID";
  const isPaid = status === "PAID";
  const isCancelled = status === "CANCELLED";
  const hasOpenAmount = openAmount > 0;

  async function runAction(action: "mark_sent" | "mark_paid" | "cancel") {
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    if (action === "cancel") {
      const confirmed = window.confirm(
        "Czy na pewno anulować tę fakturę? Nie anuluj jej, jeśli klient już zapłacił.",
      );

      if (!confirmed) {
        setIsSaving(false);
        return;
      }
    }

    if (action === "mark_paid" && hasOpenAmount) {
      const confirmed = window.confirm(
        `System dopisze brakującą płatność na kwotę ${formatMoney(
          openAmount,
          currency,
        )}. Kontynuować?`,
      );

      if (!confirmed) {
        setIsSaving(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          method: "BANK_TRANSFER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się zmienić statusu faktury.");
      }

      if (action === "mark_sent") {
        setMessage("Faktura została oznaczona jako wysłana.");
      }

      if (action === "mark_paid") {
        setMessage("Faktura została oznaczona jako opłacona.");
      }

      if (action === "cancel") {
        setMessage("Faktura została anulowana.");
      }

      router.refresh();
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Nie udało się zmienić statusu faktury.";

      setErrorMessage(nextMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Akcje faktury</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Aktualny status:{" "}
            <span className="font-semibold text-cyan-100">
              {invoiceStatusLabel(status)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/60">
            Otwarte
          </p>
          <p className="mt-1 text-lg font-black text-cyan-100">
            {formatMoney(openAmount, currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isSaving || isCancelled || !isDraft}
          onClick={() => runAction("mark_sent")}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Oznacz jako wysłana
        </button>

        <button
          type="button"
          disabled={isSaving || isCancelled || isPaid || !hasOpenAmount}
          onClick={() => runAction("mark_paid")}
          className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Oznacz jako opłacona
        </button>

        <button
          type="button"
          disabled={isSaving || isCancelled || isPaid || isPartiallyPaid}
          onClick={() => runAction("cancel")}
          className="rounded-2xl border border-red-300/30 bg-red-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:border-red-200 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anuluj fakturę
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
        {isDraft ? (
          <p>
            Faktura jest robocza. Możesz oznaczyć ją jako wysłaną, opłaconą albo
            anulować.
          </p>
        ) : null}

        {isSent ? (
          <p>
            Faktura została wysłana. Możesz dodać płatność ręcznie albo oznaczyć
            ją jako opłaconą.
          </p>
        ) : null}

        {isPartiallyPaid ? (
          <p>
            Faktura ma częściową płatność. Nie można jej anulować bez dalszej
            logiki korekty/zwrotu.
          </p>
        ) : null}

        {isPaid ? (
          <p>Faktura jest opłacona. Dalsze akcje statusu są zablokowane.</p>
        ) : null}

        {isCancelled ? (
          <p>Faktura jest anulowana. Dalsze akcje statusu są zablokowane.</p>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}