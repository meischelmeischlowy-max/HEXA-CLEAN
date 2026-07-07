"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AddInvoicePaymentFormProps = {
  invoiceId: string;
  openAmount: number;
  currency: string;
};

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Banküberweisung" },
  { value: "TWINT", label: "TWINT" },
  { value: "CASH", label: "Barzahlung" },
  { value: "CARD", label: "Karte" },
  { value: "OTHER", label: "Andere" },
];

function formatMoney(value: number, currency = "CHF") {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(value);
}

export default function AddInvoicePaymentForm({
  invoiceId,
  openAmount,
  currency,
}: AddInvoicePaymentFormProps) {
  const router = useRouter();

  const defaultAmount = useMemo(() => {
    if (!Number.isFinite(openAmount) || openAmount <= 0) {
      return "";
    }

    return openAmount.toFixed(2);
  }, [openAmount]);

  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [externalRef, setExternalRef] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const parsedAmount = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setIsSaving(false);
      setErrorMessage("Der Zahlungsbetrag muss grösser als 0 sein.");
      return;
    }

    try {
      const response = await fetch(
        `/api/dashboard/invoices/${invoiceId}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parsedAmount,
            method,
            externalRef,
            notes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Die Zahlung konnte nicht erfasst werden.");
      }

      setSuccessMessage("Die Zahlung wurde erfasst.");
      setAmount("");
      setExternalRef("");
      setNotes("");

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Zahlung konnte nicht erfasst werden.";

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (openAmount <= 0) {
    return (
      <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6">
        <h2 className="text-xl font-semibold text-emerald-100">
          Rechnung bezahlt
        </h2>
        <p className="mt-2 text-sm text-emerald-100/70">
          Für diese Rechnung ist kein offener Betrag vorhanden.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Zahlung erfassen</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Offener Betrag: {formatMoney(openAmount, currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-100/60">
            Offen
          </p>
          <p className="mt-1 text-lg font-black text-amber-100">
            {formatMoney(openAmount, currency)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-4">
        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Betrag</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/60"
            placeholder="0.00"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Methode</span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          >
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Referenz</span>
          <input
            value={externalRef}
            onChange={(event) => setExternalRef(event.target.value)}
            type="text"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/60"
            placeholder="z.B. TWINT / Bank / Belegnummer"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-300">Notiz</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            type="text"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/60"
            placeholder="z.B. Teilzahlung"
          />
        </label>

        <div className="lg:col-span-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </p>
          ) : null}
        </div>

        <div className="lg:col-span-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl border border-cyan-300/30 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Speichern..." : "Zahlung speichern"}
          </button>
        </div>
      </form>
    </section>
  );
}