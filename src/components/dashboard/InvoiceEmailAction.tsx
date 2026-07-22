"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoiceEmailActionProps = {
  invoiceId: string;
  status: string;
  recipient: string | null;
};

type InvoiceEmailResponse = {
  success?: boolean;
  message?: string;
  data?: {
    sent?: boolean;
    alreadySent?: boolean;
    recipient?: string | null;
    error?: string | null;
  };
};

export default function InvoiceEmailAction({
  invoiceId,
  status,
  recipient,
}: InvoiceEmailActionProps) {
  const router = useRouter();

  const [isSending, setIsSending] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const isCancelled =
    status === "CANCELLED";

  const buttonLabel =
    status === "SENT"
      ? "Rechnung erneut senden"
      : "Rechnung senden";

  async function sendInvoiceEmail() {
    setIsSending(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/dashboard/invoices/${invoiceId}/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: "{}",
        },
      );

      const data =
        (await response
          .json()
          .catch(() => null)) as
          | InvoiceEmailResponse
          | null;

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.message ||
            data?.data?.error ||
            "Die Rechnung konnte nicht per E-Mail gesendet werden.",
        );
      }

      if (data.data?.alreadySent) {
        setMessage(
          "Der E-Mail-Versand war bereits beim Anbieter registriert.",
        );
      } else {
        setMessage(
          data.message ||
            "Die Rechnung wurde per E-Mail gesendet.",
        );
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Die Rechnung konnte nicht per E-Mail gesendet werden.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      data-testid="invoice-email-primary-action"
      className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            Nächster Schritt
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            Rechnung per E-Mail
          </h2>

          <p className="mt-2 text-sm text-zinc-300">
            Empfänger:{" "}
            <span className="font-semibold text-white">
              {recipient ||
                "Keine E-Mail-Adresse vorhanden"}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={sendInvoiceEmail}
          disabled={
            isSending ||
            isCancelled ||
            !recipient
          }
          className="rounded-2xl border border-cyan-200 bg-cyan-300 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending
            ? "Wird gesendet..."
            : buttonLabel}
        </button>
      </div>

      {isCancelled ? (
        <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          Eine stornierte Rechnung kann nicht gesendet werden.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-100">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}