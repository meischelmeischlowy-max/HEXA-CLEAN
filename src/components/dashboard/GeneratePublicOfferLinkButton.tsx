"use client";

import { useEffect, useMemo, useState } from "react";

type GeneratePublicOfferLinkButtonProps = {
  quoteId: string;
  quoteStatus: string;
};

type PublicOfferLink = {
  id: string;
  tokenPrefix: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isActive: boolean;
};

type PublicLinkResponse = {
  ok?: boolean;
  message?: string;
  publicUrl?: string;
  links?: PublicOfferLink[];
  link?: PublicOfferLink;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLinkStatus(link: PublicOfferLink) {
  if (link.acceptedAt) {
    return {
      label: "Akzeptiert",
      className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    };
  }

  if (link.revokedAt) {
    return {
      label: "Deaktiviert",
      className: "border-red-400/30 bg-red-500/10 text-red-100",
    };
  }

  if (link.isExpired) {
    return {
      label: "Abgelaufen",
      className: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    };
  }

  if (link.isActive) {
    return {
      label: "Aktiv",
      className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    };
  }

  return {
    label: "Inaktiv",
    className: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  };
}

function buildOfferEmailSubject() {
  return "Ihre Offerte von HEXA CLEAN";
}

function buildOfferEmailBody(publicUrl: string) {
  return [
    "Guten Tag",
    "",
    "vielen Dank für Ihre Anfrage.",
    "",
    "Ihre Offerte ist unter folgendem geschützten Link verfügbar:",
    publicUrl,
    "",
    "Sie können die Offerte direkt über den Link prüfen und akzeptieren.",
    "",
    "Bitte leiten Sie diesen Link nicht weiter, da er für Ihre Offerte bestimmt ist.",
    "",
    "Freundliche Grüsse",
    "HEXA CLEAN",
  ].join("\n");
}

function buildMailToHref(publicUrl: string) {
  const subject = buildOfferEmailSubject();
  const body = buildOfferEmailBody(publicUrl);

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function GeneratePublicOfferLinkButton({
  quoteId,
  quoteStatus,
}: GeneratePublicOfferLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [revokingLinkId, setRevokingLinkId] = useState<string | null>(null);
  const [links, setLinks] = useState<PublicOfferLink[]>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const canGenerate = quoteStatus === "SENT";

  const activeLinks = useMemo(
    () =>
      links.filter(
        (link) => link.isActive && !link.acceptedAt && !link.revokedAt,
      ),
    [links],
  );

  const emailSubject = buildOfferEmailSubject();
  const emailBody = publicUrl ? buildOfferEmailBody(publicUrl) : "";
  const mailToHref = publicUrl ? buildMailToHref(publicUrl) : "#";

  async function loadLinks() {
    setIsLoadingLinks(true);

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/public-link`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as PublicLinkResponse | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(
          data?.message || "Öffentliche Angebotslinks konnten nicht geladen werden.",
        );
        return;
      }

      setLinks(data.links ?? []);
    } catch {
      setErrorMessage(
        "Verbindungsfehler. Öffentliche Angebotslinks konnten nicht geladen werden.",
      );
    } finally {
      setIsLoadingLinks(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLinks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

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
    setEmailCopied(false);

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/public-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({
            expiresInDays: 14,
            revokeExisting: true,
          }),
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as PublicLinkResponse | null;

      if (!response.ok || !data?.ok || !data.publicUrl) {
        setErrorMessage(
          data?.message || "Der öffentliche Angebotslink konnte nicht erstellt werden.",
        );
        return;
      }

      setPublicUrl(data.publicUrl);
      setMessage(data.message || "Der öffentliche Angebotslink wurde erstellt.");
      await loadLinks();
    } catch {
      setErrorMessage(
        "Verbindungsfehler. Der öffentliche Angebotslink konnte nicht erstellt werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function revokeLink(linkId: string) {
    if (revokingLinkId) {
      return;
    }

    const confirmed = window.confirm(
      "Diesen öffentlichen Angebotslink wirklich deaktivieren?",
    );

    if (!confirmed) {
      return;
    }

    setRevokingLinkId(linkId);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/dashboard/quotes/${quoteId}/public-link/${linkId}/revoke`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as PublicLinkResponse | null;

      if (!response.ok || !data?.ok) {
        setErrorMessage(
          data?.message || "Der öffentliche Angebotslink konnte nicht deaktiviert werden.",
        );
        return;
      }

      setMessage(data.message || "Der öffentliche Angebotslink wurde deaktiviert.");
      await loadLinks();
    } catch {
      setErrorMessage(
        "Verbindungsfehler. Der öffentliche Angebotslink konnte nicht deaktiviert werden.",
      );
    } finally {
      setRevokingLinkId(null);
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

  async function copyEmailText() {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`Betreff: ${emailSubject}\n\n${emailBody}`);
      setEmailCopied(true);
    } catch {
      setEmailCopied(false);
      setErrorMessage("E-Mail-Text konnte nicht automatisch kopiert werden.");
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-100">
            Öffentliche Angebotslinks
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Geschützte Kundenlinks mit Ablaufdatum, Zugriffszählung und Deaktivierung.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={generateLink}
            disabled={!canGenerate || isLoading}
            className="rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isLoading ? "Wird erstellt..." : "Kundenlink erstellen"}
          </button>

          <button
            type="button"
            onClick={loadLinks}
            disabled={isLoadingLinks}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            {isLoadingLinks ? "Wird geladen..." : "Links aktualisieren"}
          </button>
        </div>
      </div>

      {!canGenerate ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-6 text-slate-400">
          Ein neuer öffentlicher Link kann erst erstellt werden, wenn die Offerte den
          Status <span className="font-bold text-slate-100">SENT</span> hat.
        </p>
      ) : null}

      {publicUrl ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div>
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

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.05] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              E-Mail-Entwurf
            </p>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-slate-200">
              <p className="font-bold text-slate-100">Betreff: {emailSubject}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-6 text-slate-300">
                {emailBody}
              </pre>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyEmailText}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              >
                {emailCopied ? "E-Mail kopiert" : "E-Mail-Text kopieren"}
              </button>

              <a
                href={mailToHref}
                className="rounded-xl border border-cyan-400/30 px-4 py-2 text-center text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10"
              >
                Im Mailprogramm öffnen
              </a>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Sicherheitsregel: Der vollständige Token wird nicht in der Datenbank
              gespeichert. Deshalb kann dieser E-Mail-Text nur direkt nach dem
              Generieren des Links erstellt werden.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Link-Historie
          </p>

          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
            Aktiv: {activeLinks.length} / Gesamt: {links.length}
          </span>
        </div>

        {links.length === 0 ? (
          <p className="px-4 py-4 text-xs leading-6 text-slate-500">
            Noch keine öffentlichen Links für diese Offerte.
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {links.map((link) => {
              const status = getLinkStatus(link);
              const canRevoke = link.isActive && !link.acceptedAt && !link.revokedAt;

              return (
                <article key={link.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-100">
                          Token: {link.tokenPrefix ? `${link.tokenPrefix}...` : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Erstellt: {formatDateTime(link.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                      <p>Ablauf: {formatDateTime(link.expiresAt)}</p>
                      <p>Aufrufe: {link.viewCount}</p>
                      <p>Letzter Aufruf: {formatDateTime(link.lastViewedAt)}</p>
                      <p>Akzeptiert: {formatDateTime(link.acceptedAt)}</p>
                      <p>Deaktiviert: {formatDateTime(link.revokedAt)}</p>
                      <p>Aktualisiert: {formatDateTime(link.updatedAt)}</p>
                    </div>

                    {canRevoke ? (
                      <button
                        type="button"
                        onClick={() => revokeLink(link.id)}
                        disabled={revokingLinkId === link.id}
                        className="w-fit rounded-xl border border-red-400/30 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-red-900"
                      >
                        {revokingLinkId === link.id
                          ? "Wird deaktiviert..."
                          : "Link deaktivieren"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

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