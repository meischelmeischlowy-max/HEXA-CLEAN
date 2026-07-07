"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicOfferDecisionButtonProps = {
  token: string;
  disabled?: boolean;
  acceptedAt?: string | null;
};

type PublicOfferDecisionResponse = {
  ok?: boolean;
  message?: string;
};

export default function PublicOfferAcceptButton({
  token,
  disabled = false,
  acceptedAt = null,
}: PublicOfferDecisionButtonProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function acceptOffer() {
    if (disabled || isAccepting || isRejecting) {
      return;
    }

    const confirmed = window.confirm(
      "Möchten Sie diese Offerte verbindlich akzeptieren?",
    );

    if (!confirmed) {
      return;
    }

    setIsAccepting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/public/offers/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            confirmAcceptance: true,
          }),
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as PublicOfferDecisionResponse | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.message || "Die Offerte konnte nicht akzeptiert werden.");
        return;
      }

      setMessage(data.message || "Die Offerte wurde erfolgreich akzeptiert.");
      router.refresh();
    } catch {
      setErrorMessage("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsAccepting(false);
    }
  }

  async function rejectOffer() {
    if (disabled || isAccepting || isRejecting) {
      return;
    }

    const confirmed = window.confirm(
      "Möchten Sie diese Offerte verbindlich ablehnen?",
    );

    if (!confirmed) {
      return;
    }

    setIsRejecting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/public/offers/${encodeURIComponent(token)}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            confirmRejection: true,
          }),
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as PublicOfferDecisionResponse | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.message || "Die Offerte konnte nicht abgelehnt werden.");
        return;
      }

      setMessage(data.message || "Die Offerte wurde abgelehnt.");
      router.refresh();
    } catch {
      setErrorMessage("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsRejecting(false);
    }
  }

  if (acceptedAt) {
    return (
      <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-emerald-100 shadow-[0_20px_80px_rgba(16,185,129,0.12)]">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-200">
          Bereits akzeptiert
        </p>
        <p className="mt-2 text-sm text-emerald-50">
          Diese Offerte wurde am {new Date(acceptedAt).toLocaleString("de-CH")} akzeptiert.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(15,23,42,0.45)]">
      <button
        type="button"
        onClick={acceptOffer}
        disabled={disabled || isAccepting || isRejecting}
        className="w-full rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-slate-950 shadow-[0_20px_60px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none"
      >
        {isAccepting ? "Wird akzeptiert..." : "Offerte akzeptieren"}
      </button>

      <button
        type="button"
        onClick={rejectOffer}
        disabled={disabled || isAccepting || isRejecting}
        className="mt-3 w-full rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
      >
        {isRejecting ? "Wird abgelehnt..." : "Offerte ablehnen"}
      </button>

      <p className="mt-4 text-xs leading-6 text-slate-400">
        Mit dem Klick auf Akzeptieren bestätigen Sie, dass Sie die Offerte gelesen
        haben und den Auftrag zu den angegebenen Konditionen freigeben. Mit dem Klick
        auf Ablehnen wird die Offerte als abgelehnt markiert.
      </p>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}