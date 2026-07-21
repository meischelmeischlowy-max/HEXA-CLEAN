"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

import {
  getEstimatePrimaryAction,
} from "@/lib/estimate-primary-action";

type EstimatePrimaryActionProps = {
  estimateId: string;
  currentStatus?: string | null;
};

type JsonRecord =
  Record<string, unknown>;

function asRecord(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function readString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function readResponse(
  response: Response,
): Promise<JsonRecord> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return asRecord(
      JSON.parse(text),
    );
  } catch {
    return {};
  }
}

function responseMessage(
  payload: JsonRecord,
  fallback: string,
) {
  const data =
    asRecord(payload.data);

  return (
    readString(data.message) ||
    readString(payload.message) ||
    fallback
  );
}

function quoteIdFromResponse(
  payload: JsonRecord,
) {
  const data =
    asRecord(payload.data);

  const nestedQuote =
    asRecord(data.quote);

  const rootQuote =
    asRecord(payload.quote);

  return (
    readString(nestedQuote.id) ||
    readString(rootQuote.id) ||
    readString(data.quoteId) ||
    readString(payload.quoteId) ||
    null
  );
}

export default function EstimatePrimaryAction({
  estimateId,
  currentStatus,
}: EstimatePrimaryActionProps) {
  const router = useRouter();

  const action =
    getEstimatePrimaryAction(
      currentStatus,
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function runPrimaryAction() {
    if (
      isLoading ||
      !action.buttonLabel
    ) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (action.shouldRelease) {
        const releaseResponse =
          await fetch(
            `/api/dashboard/estimates/${estimateId}`,
            {
              method: "PATCH",
              credentials:
                "same-origin",
              cache: "no-store",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                status:
                  "READY_TO_SEND",
              }),
            },
          );

        const releasePayload =
          await readResponse(
            releaseResponse,
          );

        if (!releaseResponse.ok) {
          throw new Error(
            responseMessage(
              releasePayload,
              "Die Kalkulation konnte nicht freigegeben werden.",
            ),
          );
        }
      }

      const quoteResponse =
        await fetch(
          `/api/dashboard/estimates/${estimateId}/quote`,
          {
            method: "POST",
            credentials:
              "same-origin",
            cache: "no-store",
          },
        );

      const quotePayload =
        await readResponse(
          quoteResponse,
        );

      if (!quoteResponse.ok) {
        throw new Error(
          responseMessage(
            quotePayload,
            "Die Offerte konnte nicht erstellt werden.",
          ),
        );
      }

      const quoteId =
        quoteIdFromResponse(
          quotePayload,
        );

      if (!quoteId) {
        throw new Error(
          "Die Offerte wurde verarbeitet, aber die Offerten-ID fehlt in der API-Antwort.",
        );
      }

      router.push(
        `/dashboard/quotes/${quoteId}`,
      );

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler bei der Offertenerstellung.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
            Nächste Aktion
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {action.title}
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-300">
            {action.description}
          </p>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
            Eine Hauptaktion – technische Statuswechsel laufen automatisch
          </p>
        </div>

        {action.buttonLabel ? (
          <button
            type="button"
            onClick={runPrimaryAction}
            disabled={isLoading}
            className="min-h-14 shrink-0 rounded-2xl border border-cyan-100/60 bg-cyan-300 px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Wird ausgeführt..."
              : action.buttonLabel}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm font-bold text-red-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
