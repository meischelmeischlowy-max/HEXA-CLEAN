"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

type SendQuoteToCustomerButtonProps = {
  quoteId: string;
};

type SendResult = {
  ok?: boolean;
  message?: string;
  recipient?: string | null;
  alreadySent?: boolean;
  details?: {
    error?: string;
  };
};

async function readResult(
  response: Response,
): Promise<SendResult> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(
      text,
    ) as SendResult;
  } catch {
    return {};
  }
}

export default function SendQuoteToCustomerButton({
  quoteId,
}: SendQuoteToCustomerButtonProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function sendQuote() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/dashboard/quotes/${quoteId}/public-link`,
          {
            method: "POST",
            credentials:
              "same-origin",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              expiresInDays: 14,
              revokeExisting: true,
            }),
          },
        );

      const result =
        await readResult(response);

      if (
        !response.ok ||
        result.ok !== true
      ) {
        throw new Error(
          result.details?.error ||
            result.message ||
            "Die Offerte konnte nicht versendet werden.",
        );
      }

      setMessage(
        result.alreadySent
          ? "Die Offerte wurde bereits versendet."
          : result.recipient
            ? `Die Offerte wurde an ${result.recipient} übergeben.`
            : "Der E-Mail-Versand wurde vom Provider angenommen.",
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Offertenversand.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={sendQuote}
        disabled={isLoading}
        className="min-h-14 rounded-2xl border border-cyan-100/60 bg-cyan-300 px-6 py-4 text-sm font-black uppercase tracking-[0.1em] text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "Offerte wird versendet..."
          : "Offerte an Kunden senden"}
      </button>

      {message ? (
        <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
