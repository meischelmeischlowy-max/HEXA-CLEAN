"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreatePaymentFromInvoiceButtonProps = {
  invoiceId: string;
};

type InvoicePaymentsResponse = {
  error?: string;
  invoiceId?: string;
  status?: string;
  total?: unknown;
  paidAmount?: unknown;
};

type CreatePaymentResponse = {
  error?: string;
  payment?: {
    id: string;
  };
  invoice?: {
    id: string;
    status: string;
  };
  automation?: {
    previousStatus: string;
    nextStatus: string;
    paidAmount: number;
    total: number;
  };
};

function decimalToNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function CreatePaymentFromInvoiceButton({
  invoiceId,
}: CreatePaymentFromInvoiceButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function readJson<T>(response: Response): Promise<T> {
    const rawText = await response.text();

    if (!rawText.trim()) {
      throw new Error(
        `Die API hat eine leere Antwort zurückgegeben. HTTP-Status: ${response.status}`
      );
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      throw new Error(
        `Die API hat kein JSON zurückgegeben. HTTP-Status: ${
          response.status
        }. Antwort: ${rawText.slice(0, 300)}`
      );
    }
  }

  async function handleCreatePayment() {
    const confirmed = window.confirm(
      "Den offenen Rechnungsbetrag wirklich als bezahlte Zahlung erfassen?"
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const paymentsResponse = await fetch(
        `/api/dashboard/invoices/${invoiceId}/payments`,
        {
          method: "GET",
          credentials: "same-origin",
        }
      );

      const paymentsData = await readJson<InvoicePaymentsResponse>(
        paymentsResponse
      );

      if (!paymentsResponse.ok || paymentsData.error) {
        throw new Error(
          paymentsData.error ??
            "Die offenen Rechnungsdaten konnten nicht geladen werden."
        );
      }

      const total = decimalToNumber(paymentsData.total);
      const paidAmount = decimalToNumber(paymentsData.paidAmount);
      const openAmount = roundMoney(total - paidAmount);

      if (openAmount <= 0) {
        throw new Error("Diese Rechnung hat keinen offenen Betrag mehr.");
      }

      const paymentResponse = await fetch(
        `/api/dashboard/invoices/${invoiceId}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            amount: openAmount,
            method: "BANK_TRANSFER",
            notes: "Payment recorded from invoice quick action.",
          }),
        }
      );

      const paymentData = await readJson<CreatePaymentResponse>(paymentResponse);

      if (!paymentResponse.ok || paymentData.error || !paymentData.payment?.id) {
        throw new Error(
          paymentData.error ?? "Die Zahlung konnte nicht erstellt werden."
        );
      }

      router.push(`/dashboard/payments/${paymentData.payment.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Zahlung."
      );
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
        {isLoading ? "Zahlung wird erstellt..." : "Offenen Betrag als bezahlt erfassen"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}