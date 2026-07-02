"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoicePaymentRecorderProps = {
  invoiceId: string;
  total: number;
  paidAmount: number;
  currency: string;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: currency || "CHF",
  }).format(Number.isFinite(value) ? value : 0);
}

export default function InvoicePaymentRecorder({
  invoiceId,
  total,
  paidAmount,
  currency,
}: InvoicePaymentRecorderProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPaid = Number(paidAmount || 0);
  const remaining = Math.max(total - currentPaid, 0);

  async function savePayment() {
    const rawAmount = Number(amount.replace(",", "."));

    setMessage(null);
    setError(null);

    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      setError("Wpisz poprawną kwotę.");
      return;
    }

    const nextPaidAmount = mode === "add" ? currentPaid + rawAmount : rawAmount;

    const safePaidAmount = Math.max(nextPaidAmount, 0);

    const nextStatus =
      safePaidAmount >= total && total > 0
        ? "PAID"
        : safePaidAmount > 0
          ? "PARTIALLY_PAID"
          : "SENT";

    setLoading(true);

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paidAmount: safePaidAmount,
          status: nextStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setAmount("");
      setMessage("Wpłata została zapisana na fakturze.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Nie udało się zapisać wpłaty.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsFullyPaid() {
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paidAmount: total,
          status: "PAID",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setAmount("");
      setMessage("Faktura została oznaczona jako opłacona.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Nie udało się oznaczyć faktury jako opłaconej.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Wpłata / rozliczenie</h2>

          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
            <p>
              Total:{" "}
              <span className="font-semibold text-white">{formatMoney(total, currency)}</span>
            </p>
            <p>
              Zapłacono:{" "}
              <span className="font-semibold text-emerald-300">
                {formatMoney(currentPaid, currency)}
              </span>
            </p>
            <p>
              Pozostało:{" "}
              <span className="font-semibold text-rose-300">
                {formatMoney(remaining, currency)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Kwota
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="np. 100.00"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 lg:w-40"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Tryb
            </label>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "add" | "replace")}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400 lg:w-52"
            >
              <option value="add">Dodaj do zapłacono</option>
              <option value="replace">Ustaw zapłacono na kwotę</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={savePayment}
            className="rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Zapisywanie..." : "Zapisz wpłatę"}
          </button>

          <button
            type="button"
            disabled={loading || total <= 0}
            onClick={markAsFullyPaid}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Opłacona w całości
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}