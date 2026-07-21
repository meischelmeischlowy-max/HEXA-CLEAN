"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderId: string;
  initialStart?: string | null;
  initialEnd?: string | null;
};

function toLocalDateTime(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

export default function ScheduleOrderButton({
  orderId,
  initialStart,
  initialEnd,
}: Props) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [
    scheduledStart,
    setScheduledStart,
  ] = useState(
    toLocalDateTime(initialStart),
  );

  const [
    scheduledEnd,
    setScheduledEnd,
  ] = useState(
    toLocalDateTime(initialEnd),
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function saveSchedule() {
    if (!scheduledStart) {
      setError(
        "Bitte einen Starttermin auswählen.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dashboard/orders/${orderId}/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            scheduledStart,
            scheduledEnd:
              scheduledEnd || null,
          }),
        },
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.status !== "OK"
      ) {
        throw new Error(
          result.message ||
            "Der Termin konnte nicht gespeichert werden.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verbindungsfehler zur API.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-cyan-400 bg-cyan-400/15 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/25"
      >
        Termin planen
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-cyan-400/30 bg-neutral-950 p-4">
      <p className="text-sm font-bold text-white">
        Ausführungstermin festlegen
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Start

          <input
            type="datetime-local"
            value={scheduledStart}
            onChange={(event) =>
              setScheduledStart(
                event.target.value,
              )
            }
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Ende optional

          <input
            type="datetime-local"
            value={scheduledEnd}
            onChange={(event) =>
              setScheduledEnd(
                event.target.value,
              )
            }
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveSchedule}
          disabled={loading}
          className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-neutral-950 transition hover:bg-cyan-300 disabled:opacity-60"
        >
          {loading
            ? "Wird gespeichert..."
            : "Termin bestätigen"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          disabled={loading}
          className="rounded-xl border border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
