"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoicePaymentRecorderProps = {
  invoiceId: string;
  total: number;
  paidAmount: number;
  currency: string;
};

type PaymentMethod = {
  value: string;
  label: string;
};

const paymentMethods: PaymentMethod[] = [
  { value: "BANK_TRANSFER", label: "Przelew" },
  { value: "CASH", label: "Barzahlung" },
  { value: "TWINT", label: "TWINT" },
  { value: "CARD", label: "Karta" },
  { value: "OTHER", label: "Inna" },
];

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
      setError("Bitte einen gültigen Zahlungsbetrag eingeben.");
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
      setMessage("Die Zahlung wurde als Zahlung gespeichert und die Rechnung aktualisiert.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Die Zahlung konnte nicht gespeichert werden.");
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
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
              Rechnungsausgleich
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Zahlung / Ausgleich
            </h2>

            <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total
                </p>
                <p className="mt-1 font-bold text-white">
                  {formatMoney(total, safeCurrency)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                  Bezahlt
                </p>
                <p className="mt-1 font-bold text-emerald-300">
                  {formatMoney(currentPaid, safeCurrency)}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300/70">
                  Offen
                </p>
                <p className="mt-1 font-bold text-rose-300">
                  {formatMoney(remaining, safeCurrency)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[690px]">
            <div className="grid gap-3 lg:grid-cols-[160px_1fr_auto_auto] lg:items-end">
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
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Metoda
                </label>

                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((paymentMethod) => {
                    const active = method === paymentMethod.value;

                    return (
                      <button
                        key={paymentMethod.value}
                        type="button"
                        disabled={loading}
                        onClick={() => setMethod(paymentMethod.value)}
                        className={
                          active
                            ? "rounded-xl border border-cyan-400/50 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-100 transition disabled:opacity-60"
                            : "rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:opacity-60"
                        }
                      >
                        {paymentMethod.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={savePayment}
                className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Wird gespeichert..." : "Zahlung speichern"}
              </button>

              <button
                type="button"
                disabled={loading || remaining <= 0}
                onClick={markAsFullyPaid}
                className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vollständig bezahlt
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <input
            value={externalRef}
            onChange={(event) => setExternalRef(event.target.value)}
            placeholder="Referenz / Transaktionsnummer"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
          />

          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notiz zur Zahlung"
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
          />
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}