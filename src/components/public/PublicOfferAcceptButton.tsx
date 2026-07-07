"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicOfferAcceptButtonProps = {
  token: string;
  disabled?: boolean;
  acceptedAt?: string | null;
};

export default function PublicOfferAcceptButton({
  token,
  disabled = false,
  acceptedAt = null,
}: PublicOfferAcceptButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function acceptOffer() {
    if (disabled || isSubmitting) {
      return;
    }

    const confirmed = window.confirm(
      "Möchten Sie diese Offerte verbindlich akzeptieren?",
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/public/offers/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          confirmAcceptance: true,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.message || "Die Offerte konnte nicht akzeptiert werden.");
        return;
      }

      setMessage(data.message || "Die Offerte wurde erfolgreich akzeptiert.");
      router.refresh();
    } catch {
      setErrorMessage("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
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
        disabled={disabled || isSubmitting}
        className="w-full rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-slate-950 shadow-[0_20px_60px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none"
      >
        {isSubmitting ? "Wird akzeptiert..." : "Offerte akzeptieren"}
      </button>

      <p className="mt-4 text-xs leading-6 text-slate-400">
        Mit dem Klick bestätigen Sie, dass Sie die Offerte gelesen haben und den Auftrag zu
        den angegebenen Konditionen freigeben.
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