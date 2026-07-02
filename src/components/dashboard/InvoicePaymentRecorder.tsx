"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoicePaymentRecorderProps = {
  invoiceId: string;
  total: number;
  paidAmount: number;
  currency: string;
};

function normalizeCurrency(value: string) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;
  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: normalizeCurrency(currency),
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
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [externalRef, setExternalRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPaid = Number(paidAmount || 0);
  const remaining = Math.max(total - currentPaid, 0);
  const safeCurrency = normalizeCurrency(currency);

  async function createPayment(paymentAmount: number) {
    setMessage(null);
    setError(null);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Wpisz poprawną kwotę wpłaty.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          amount: paymentAmount,
          method,
          status: "PAID",
          externalRef,
          notes,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.data?.message || `HTTP ${response.status}`);
      }

      setAmount("");
      setExternalRef("");
      setNotes("");
      setMessage("Wpłata została zapisana jako płatność i faktura została zaktualizowana.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Nie udało się zapisać wpłaty.");
    } finally {
      setLoading(false);
    }
  }

  function savePayment() {
    const rawAmount = Number(amount.replace(",", "."));
    void createPayment(rawAmount);
  }

  function markAsFullyPaid() {
    void createPayment(remaining);
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Wpłata / rozliczenie</h2>

            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
              <p>
                Total:{" "}
                <span className="font-semibold text-white">
                  {formatMoney(total, safeCurrency)}
                </span>
              </p>

              <p>
                Zapłacono:{" "}
                <span className="font-semibold text-emerald-300">
                  {formatMoney(currentPaid, safeCurrency)}
                </span>
              </p>

              <p>
                Pozostało:{" "}
                <span className="font-semibold text-rose-300">
                  {formatMoney(remaining, safeCurrency)}
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
                Metoda
              </label>
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400 lg:w-52"
              >
                <option value="BANK_TRANSFER">Przelew bankowy</option>
                <option value="CASH">Gotówka</option>
                <option value="TWINT">TWINT</option>
                <option value="CARD">Karta</option>
                <option value="OTHER">Inna metoda</option>
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
              disabled={loading || remaining <= 0}
              onClick={markAsFullyPaid}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Opłacona w całości
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <input
            value={externalRef}
            onChange={(event) => setExternalRef(event.target.value)}
            placeholder="Referencja / numer transakcji"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
          />

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notatka do płatności"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
          />
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