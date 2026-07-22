"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type EstimateStatus =
  | "DRAFT"
  | "AI_REVIEW"
  | "NEEDS_PHOTOS"
  | "NEEDS_HUMAN_REVIEW"
  | "READY_TO_SEND"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

type ApiResponse = {
  data?: {
    status?: string;
    message?: string;
    currentStatus?: string;
    requestedStatus?: string;
  };
  message?: string;
};

type QuoteApiResponse = {
  data?: {
    status?: string;
    message?: string;
    created?: boolean;
    quote?: {
      id?: string;
      quoteNumber?: string;
    } | null;
  };
  message?: string;
};

const statuses: {
  value: EstimateStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "DRAFT",
    label: "Entwurf",
    description: "Interne Kalkulation ist noch nicht geprüft.",
  },
  {
    value: "AI_REVIEW",
    label: "KI-Prüfung",
    description: "Automatisch vorbereitet, braucht Kontrolle.",
  },
  {
    value: "NEEDS_PHOTOS",
    label: "Fotos erforderlich",
    description: "Kunde muss Fotos oder Uploads liefern.",
  },
  {
    value: "NEEDS_HUMAN_REVIEW",
    label: "Interne Prüfung",
    description: "Inhaber / Operator muss freigeben.",
  },
  {
    value: "READY_TO_SEND",
    label: "Bereit für Offerte",
    description: "Kalkulation ist freigegeben. Offerte vorbereiten.",
  },
  {
    value: "SENT",
    label: "Versendet",
    description: "Offerte / Nachricht wurde gesendet.",
  },
  {
    value: "ACCEPTED",
    label: "Akzeptiert",
    description: "Kunde hat zugesagt. Auftrag planen.",
  },
  {
    value: "REJECTED",
    label: "Abgelehnt",
    description: "Kunde hat abgelehnt.",
  },
  {
    value: "EXPIRED",
    label: "Abgelaufen",
    description: "Offerte ist nicht mehr gültig.",
  },
];

function normalizeStatus(value?: string | null): EstimateStatus {
  const normalized = String(value || "DRAFT").toUpperCase();

  if (
    normalized === "DRAFT" ||
    normalized === "AI_REVIEW" ||
    normalized === "NEEDS_PHOTOS" ||
    normalized === "NEEDS_HUMAN_REVIEW" ||
    normalized === "READY_TO_SEND" ||
    normalized === "SENT" ||
    normalized === "ACCEPTED" ||
    normalized === "REJECTED" ||
    normalized === "EXPIRED"
  ) {
    return normalized;
  }

  return "DRAFT";
}

function isFinalStatus(status: EstimateStatus) {
  return status === "ACCEPTED" || status === "REJECTED" || status === "EXPIRED";
}

function canSelectStatus(current: EstimateStatus, next: EstimateStatus) {
  if (current === next) return false;
  if (isFinalStatus(current)) return false;

  if (
    next === "DRAFT" ||
    next === "AI_REVIEW" ||
    next === "NEEDS_PHOTOS" ||
    next === "NEEDS_HUMAN_REVIEW"
  ) {
    return current !== "SENT";
  }

  if (next === "READY_TO_SEND") {
    return (
      current === "DRAFT" ||
      current === "AI_REVIEW" ||
      current === "NEEDS_PHOTOS" ||
      current === "NEEDS_HUMAN_REVIEW"
    );
  }

  if (next === "SENT") return current === "READY_TO_SEND";

  if (next === "ACCEPTED" || next === "REJECTED" || next === "EXPIRED") {
    return current === "SENT";
  }

  return false;
}

function processMessage(status: EstimateStatus) {
  if (
    status === "DRAFT" ||
    status === "AI_REVIEW" ||
    status === "NEEDS_PHOTOS" ||
    status === "NEEDS_HUMAN_REVIEW"
  ) {
    return {
      tone: "amber",
      title: "Interne Prüfung offen",
      message:
        "Diese Kalkulation ist noch intern. Erst nach Kontrolle auf Bereit für Offerte setzen.",
    };
  }

  if (status === "READY_TO_SEND") {
    return {
      tone: "cyan",
      title: "Offerte vorbereiten",
      message:
        "Die Kalkulation ist freigegeben. Jetzt Offerte erstellen/prüfen und danach senden.",
    };
  }

  if (status === "SENT") {
    return {
      tone: "cyan",
      title: "Wartet auf Kundenantwort",
      message:
        "Der Vorgang ist als versendet markiert. Jetzt Antwort über E-Mail, Kundenlink, Chat oder Rückfrage prüfen.",
    };
  }

  if (status === "ACCEPTED") {
    return {
      tone: "green",
      title: "Kunde hat akzeptiert",
      message:
        "Nächster Schritt: Auftrag planen. Rechnung erst nach ausgeführter Leistung oder klarer Anzahlung.",
    };
  }

  if (status === "REJECTED") {
    return {
      tone: "red",
      title: "Kunde hat abgelehnt",
      message:
        "Fall dokumentieren, neue Version vorbereiten oder Vorgang abschließen.",
    };
  }

  return {
    tone: "amber",
    title: "Offerte abgelaufen",
    message:
      "Entscheiden: erneuern, neue Version vorbereiten oder Vorgang abschließen.",
  };
}

function messageClass(tone: string) {
  if (tone === "green") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "red") {
    return "border-red-300/20 bg-red-300/10 text-red-100";
  }

  if (tone === "cyan") {
    return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

function statusButtonClass({
  active,
  disabled,
}: {
  active: boolean;
  disabled: boolean;
}) {
  if (active) {
    return "border-cyan-300/50 bg-cyan-300/15 text-cyan-50";
  }

  if (disabled) {
    return "border-white/10 bg-white/[0.02] text-zinc-600";
  }

  return "border-white/10 bg-black/20 text-zinc-200 hover:border-cyan-300/40 hover:bg-cyan-300/10";
}

export default function EstimateStatusActions({
  estimateId,
  currentStatus,
}: {
  estimateId: string;
  currentStatus?: string | null;
}) {
  const router = useRouter();
  const normalizedCurrentStatus = normalizeStatus(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<EstimateStatus | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);

  const currentProcessMessage = useMemo(
    () => processMessage(normalizedCurrentStatus),
    [normalizedCurrentStatus],
  );

  async function updateStatus(nextStatus: EstimateStatus) {
    if (!canSelectStatus(normalizedCurrentStatus, nextStatus)) return;

    setPendingStatus(nextStatus);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/dashboard/estimates/${estimateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const json = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          json.data?.message ??
            json.message ??
            "Der Status konnte nicht aktualisiert werden.",
        );
      }

      setMessage(
        json.data?.message ??
          `Status wurde auf ${nextStatus} aktualisiert.`,
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Statuswechsel.",
      );
    } finally {
      setPendingStatus(null);
    }
  }

  async function createQuote() {
    if (normalizedCurrentStatus !== "READY_TO_SEND" || isCreatingQuote) {
      return;
    }

    setIsCreatingQuote(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/estimates/${estimateId}/quote`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      const json = (await response.json()) as QuoteApiResponse;

      if (!response.ok || json.data?.status === "error") {
        throw new Error(
          json.data?.message ??
            json.message ??
            "Die Offerte konnte nicht erstellt werden.",
        );
      }

      const quoteId = json.data?.quote?.id;

      if (!quoteId) {
        throw new Error(
          "Die API meldet Erfolg, aber es wurde keine Quote-ID zurückgegeben.",
        );
      }

      router.push(`/dashboard/quotes/${quoteId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler beim Erstellen der Offerte.",
      );
    } finally {
      setIsCreatingQuote(false);
    }
  }

  return (
    <section
      id="status-aktionen"
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
            Status und Freigabe
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-black text-white">
              Kalkulation Workflow
            </h2>

            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
              {normalizedCurrentStatus}
            </span>
          </div>

          <p className="mt-2 max-w-5xl text-sm leading-6 text-zinc-400">
            Dieser Bereich steuert nur die interne Kalkulation. Offerte,
            Auftrag, Rechnung und Zahlung bleiben eigene Prozessschritte.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {normalizedCurrentStatus === "READY_TO_SEND" ? (
            <button
              type="button"
              onClick={() => void createQuote()}
              disabled={isCreatingQuote}
              className="rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingQuote ? "Offerte wird erstellt..." : "Offerte erstellen"}
            </button>
          ) : null}

          {normalizedCurrentStatus === "SENT" ? (
            <Link
              href={`/dashboard/estimates/${estimateId}/offer`}
              className="rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-300/25"
            >
              Offerte / Versand prüfen
            </Link>
          ) : null}

          {normalizedCurrentStatus === "ACCEPTED" ? (
            <Link
              href="/dashboard/orders"
              className="rounded-2xl border border-emerald-300/30 bg-emerald-300/15 px-5 py-3 text-center text-sm font-black text-emerald-100 transition hover:bg-emerald-300/25"
            >
              Auftrag vorbereiten
            </Link>
          ) : null}

          <Link
            href="/dashboard/quotes"
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-center text-sm font-bold text-zinc-200 transition hover:bg-white/10"
          >
            Offerten öffnen
          </Link>
        </div>
      </div>

      <div
        className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${messageClass(
          currentProcessMessage.tone,
        )}`}
      >
        <p className="font-black">{currentProcessMessage.title}</p>
        <p className="mt-1 leading-6 opacity-80">
          {currentProcessMessage.message}
        </p>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((status) => {
          const isActive = normalizedCurrentStatus === status.value;
          const isDisabled = !canSelectStatus(
            normalizedCurrentStatus,
            status.value,
          );
          const isPending = pendingStatus === status.value;

          return (
            <button
              key={status.value}
              type="button"
              title={status.description}
              onClick={() => updateStatus(status.value)}
              disabled={isDisabled || Boolean(pendingStatus)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition disabled:cursor-not-allowed ${statusButtonClass(
                {
                  active: isActive,
                  disabled: isDisabled,
                },
              )}`}
            >
              <span>{status.label}</span>
              <span className="ml-2 text-[10px] uppercase tracking-[0.14em] opacity-50">
                {isPending
                  ? "speichert"
                  : isActive
                    ? "aktiv"
                    : isDisabled
                      ? "gesperrt"
                      : "setzen"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}