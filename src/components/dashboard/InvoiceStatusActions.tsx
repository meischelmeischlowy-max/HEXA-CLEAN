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
    DRAFT: "Entwurf",
    SENT: "Versendet",
    PARTIALLY_PAID: "Teilweise bezahlt",
    PAID: "Bezahlt",
    OVERDUE: "Überfällig",
    CANCELLED: "Storniert",
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
  const isOverdue = status === "OVERDUE";
  const isCancelled = status === "CANCELLED";
  const hasOpenAmount = openAmount > 0;

  async function patchInvoice(payload: Record<string, unknown>) {
    const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data?.data?.status !== "success") {
      throw new Error(
        data?.data?.message ??
          "Die Rechnungsaktion konnte nicht ausgeführt werden.",
      );
    }

    return data;
  }

  async function markAsSent() {
    const confirmed = window.confirm(
      "Möchten Sie diese Rechnung wirklich als versendet markieren?",
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await patchInvoice({
        status: "SENT",
      });

      setMessage("Die Rechnung wurde als versendet markiert.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Rechnung konnte nicht als versendet markiert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelInvoice() {
    const confirmed = window.confirm(
      "Möchten Sie diese Rechnung wirklich stornieren? Bitte nicht stornieren, wenn der Kunde bereits bezahlt hat.",
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await patchInvoice({
        status: "CANCELLED",
      });

      setMessage("Die Rechnung wurde storniert.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Rechnung konnte nicht storniert werden.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rechnungsaktionen</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Aktueller Status:{" "}
            <span className="font-semibold text-cyan-100">
              {invoiceStatusLabel(status)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/60">
            Offen
          </p>
          <p className="mt-1 text-lg font-black text-cyan-100">
            {formatMoney(openAmount, currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={isSaving || isCancelled || !isDraft}
          onClick={markAsSent}
          className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Als versendet markieren
        </button>

        <button
          type="button"
          disabled={isSaving || isCancelled || isPaid || isPartiallyPaid}
          onClick={cancelInvoice}
          className="rounded-2xl border border-red-300/30 bg-red-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-red-100 transition hover:border-red-200 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rechnung stornieren
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
        {isDraft ? (
          <p>
            Die Rechnung ist im Entwurf. Nach dem Versand setzt das System den
            Status automatisch auf „Versendet“.
          </p>
        ) : null}

        {isSent ? (
          <p>
            Die Rechnung wurde versendet. Zahlungen werden über das
            Zahlungsformular erfasst. Der Rechnungsstatus wird danach automatisch
            berechnet.
          </p>
        ) : null}

        {isOverdue ? (
          <p>
            Die Rechnung ist überfällig. Sobald eine Zahlung erfasst wird,
            berechnet das System den neuen Status automatisch.
          </p>
        ) : null}

        {isPartiallyPaid ? (
          <p>
            Die Rechnung hat eine Teilzahlung. Der offene Betrag beträgt{" "}
            <span className="font-semibold text-cyan-100">
              {formatMoney(openAmount, currency)}
            </span>
            . Weitere Zahlungen aktualisieren den Status automatisch.
          </p>
        ) : null}

        {isPaid ? (
          <p>
            Die Rechnung ist bezahlt. Der Status wurde aus den erfassten
            Zahlungen berechnet.
          </p>
        ) : null}

        {isCancelled ? (
          <p>Die Rechnung ist storniert. Weitere Statusaktionen sind gesperrt.</p>
        ) : null}

        {!isPaid && !isCancelled && hasOpenAmount ? (
          <p className="mt-3 text-xs text-neutral-500">
            Keine manuelle „Bezahlt“-Aktion: Eine Rechnung wird erst durch eine
            echte Zahlung als teilweise oder vollständig bezahlt markiert.
          </p>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-300/10 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}