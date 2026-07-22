"use client";

import {
  useMemo,
  useState,
} from "react";

type PublicSlot = {
  id: string;
  startAt: string;
  endAt: string;
};

type ApiResult = {
  ok?: boolean;
  message?: string;
  appointment?: {
    startAt?: string | null;
    endAt?: string | null;
  };
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(date);
}

export default function PublicOfferScheduleDecision({
  token,
  slots,
}: {
  token: string;
  slots: PublicSlot[];
}) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  const selectedSlot = useMemo(
    () =>
      slots.find(
        (slot) => slot.id === selectedSlotId,
      ) ?? null,
    [selectedSlotId, slots],
  );

  async function acceptWithSlot() {
    setError("");

    if (!selectedSlotId) {
      setError("Bitte waehlen Sie zuerst einen Termin aus.");
      return;
    }

    if (!confirmed) {
      setError("Bitte bestaetigen Sie die verbindliche Annahme.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/public/offers/${encodeURIComponent(token)}/accept-with-slot`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmAcceptance: true,
            availabilitySlotId: selectedSlotId,
          }),
        },
      );

      const payload = (await response.json()) as ApiResult;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ||
            "Die Offerte konnte nicht akzeptiert werden.",
        );
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unbekannter Fehler",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    const startAt =
      result.appointment?.startAt ??
      selectedSlot?.startAt ??
      null;
    const endAt =
      result.appointment?.endAt ??
      selectedSlot?.endAt ??
      null;

    return (
      <section className="rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-6 text-emerald-50">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">
          Bestaetigt
        </p>
        <p className="mt-3 text-sm leading-7">
          {result.message}
        </p>

        {startAt ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-slate-950/30 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
              Ihr Termin
            </p>
            <p className="mt-2 font-bold">
              {formatDateTime(startAt)}
            </p>
            {endAt ? (
              <p className="mt-1 text-sm text-emerald-100/80">
                Ende: {formatDateTime(endAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-emerald-400/25 bg-emerald-500/[0.08] p-6 shadow-[0_25px_90px_rgba(16,185,129,0.12)]">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">
        Offerte und Termin
      </p>

      <h2 className="mt-3 text-xl font-black">
        Termin auswaehlen
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-300">
        Die Offerte wird erst zusammen mit dem ausgewaehlten Termin verbindlich angenommen.
      </p>

      {slots.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Zurzeit ist kein freier Termin verfuegbar. Bitte kontaktieren Sie HEXA CLEAN.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {slots.map((slot) => {
            const selected = slot.id === selectedSlotId;

            return (
              <label
                key={slot.id}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-400/15"
                    : "border-white/10 bg-slate-950/35 hover:border-emerald-300/40"
                }`}
              >
                <input
                  type="radio"
                  name="availabilitySlot"
                  value={slot.id}
                  checked={selected}
                  onChange={() => setSelectedSlotId(slot.id)}
                  className="mt-1"
                />

                <span>
                  <span className="block font-bold text-white">
                    {formatDateTime(slot.startAt)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Ende: {formatDateTime(slot.endAt)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <label className="mt-5 flex gap-3 text-sm leading-6 text-slate-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) =>
            setConfirmed(event.target.checked)
          }
          className="mt-1"
        />
        <span>
          Ich akzeptiere die Offerte verbindlich und bestaetige den ausgewaehlten Termin.
        </span>
      </label>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void acceptWithSlot()}
        disabled={
          loading ||
          slots.length === 0 ||
          !selectedSlotId ||
          !confirmed
        }
        className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Wird bestaetigt..."
          : "Offerte und Termin verbindlich bestaetigen"}
      </button>
    </section>
  );
}
