"use client";

import { useState } from "react";

type GeneratePublicOfferLinkButtonProps = {
  quoteId: string;
  quoteStatus: string;
};

type PublicLinkResponse = {
  ok?: boolean;
  message?: string;
  publicUrl?: string;
  link?: {
    expiresAt?: string;
    isActive?: boolean;
  };
};

export default function GeneratePublicOfferLinkButton({
  quoteId,
  quoteStatus,
}: GeneratePublicOfferLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = quoteStatus === "SENT";

  async function generateLink() {
    if (!canGenerate || isLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Neuen öffentlichen Angebotslink erstellen? Bestehende aktive Links werden deaktiviert.",
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setPublicUrl(null);
    setMessage(null);
    setErrorMessage(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/dashboard/quotes/${quoteId}/public-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          expiresInDays: 14,
          revokeExisting: true,
        }),
      });

      const data = (await response.json().catch(() => null)) as PublicLinkResponse | null;

      if (!response.ok || !data?.ok || !data.publicUrl) {
        setErrorMessage(data?.message || "Public link could not be generated.");
        return;
      }

      setPublicUrl(data.publicUrl);
      setMessage(data.message || "Public offer link generated.");
    } catch {
      setErrorMessage("Network error. Public link could not be generated.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setErrorMessage("Link konnte nicht automatisch kopiert werden.");
    }
  }

  if (!canGenerate) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
        <p className="font-bold text-slate-300">Public offer link</p>
        <p className="mt-2 leading-6">
          Ein öffentlicher Link kann erst erstellt werden, wenn die Offerte den Status{" "}
          <span className="font-bold text-slate-100">SENT</span> hat.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-100">Public offer link</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Erstellt einen geschützten Kundenlink. Der Token wird nur einmal angezeigt.
          </p>
        </div>

        <button
          type="button"
          onClick={generateLink}
          disabled={isLoading}
          className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        >
          {isLoading ? "Erstelle..." : "Kundenlink erstellen"}
        </button>
      </div>

      {publicUrl ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Link nur jetzt kopieren
          </p>

          <div className="mt-3 break-all rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-100">
            {publicUrl}
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
          >
            {copied ? "Kopiert" : "Link kopieren"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}