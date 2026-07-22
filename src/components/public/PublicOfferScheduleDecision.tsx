"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type AvailabilitySlot = {
  id: string;
  startAt: string;
  endAt: string;
};

type Props = {
  token: string;
  slots: AvailabilitySlot[];
};

type DayGroup = {
  key: string;
  date: Date;
  slots: AvailabilitySlot[];
};

type DecisionResponse = {
  ok?: boolean;
  message?: string;
};

const INITIAL_VISIBLE_DAYS = 7;
const TIME_ZONE = "Europe/Zurich";

function getDayKey(
  value: string,
) {
  const date = new Date(value);

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function formatDay(
  value: Date,
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      timeZone: TIME_ZONE,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    },
  ).format(value);
}

function formatDayLong(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  ).format(
    new Date(value),
  );
}

export default function PublicOfferScheduleDecision({
  token,
  slots,
}: Props) {
  const router = useRouter();

  const groups =
    useMemo<DayGroup[]>(() => {
      const map =
        new Map<
          string,
          DayGroup
        >();

      const orderedSlots = [
        ...slots,
      ].sort(
        (left, right) =>
          new Date(
            left.startAt,
          ).getTime() -
          new Date(
            right.startAt,
          ).getTime(),
      );

      for (
        const slot
        of orderedSlots
      ) {
        const key =
          getDayKey(
            slot.startAt,
          );

        const current =
          map.get(key);

        if (current) {
          current.slots.push(
            slot,
          );

          continue;
        }

        map.set(
          key,
          {
            key,
            date:
              new Date(
                slot.startAt,
              ),
            slots: [
              slot,
            ],
          },
        );
      }

      return [
        ...map.values(),
      ];
    }, [slots]);

  const [
    visibleDayCount,
    setVisibleDayCount,
  ] = useState(
    INITIAL_VISIBLE_DAYS,
  );

  const [
    selectedDayKey,
    setSelectedDayKey,
  ] = useState(
    groups[0]?.key ?? "",
  );

  const [
    selectedSlotId,
    setSelectedSlotId,
  ] = useState("");

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    rejecting,
    setRejecting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedDay =
    groups.find(
      (group) =>
        group.key ===
        selectedDayKey,
    ) ??
    groups[0] ??
    null;

  const selectedSlot =
    slots.find(
      (slot) =>
        slot.id ===
        selectedSlotId,
    ) ?? null;

  const visibleGroups =
    groups.slice(
      0,
      visibleDayCount,
    );

  function selectDay(
    dayKey: string,
  ) {
    setSelectedDayKey(
      dayKey,
    );

    setSelectedSlotId("");
    setConfirmed(false);
    setError("");
  }

  async function acceptOffer() {
    if (!selectedSlotId) {
      setError(
        "Bitte wählen Sie zuerst einen Termin aus.",
      );

      return;
    }

    if (!confirmed) {
      setError(
        "Bitte bestätigen Sie die verbindliche Annahme.",
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/public/offers/${encodeURIComponent(
            token,
          )}/accept-with-slot`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                confirmAcceptance:
                  true,

                availabilitySlotId:
                  selectedSlotId,
              }),
          },
        );

      const result =
        await response.json() as
          DecisionResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
            "Die Offerte konnte nicht bestätigt werden.",
        );
      }

      router.refresh();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Die Offerte konnte nicht bestätigt werden.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function rejectOffer() {
    const rejectionConfirmed =
      window.confirm(
        "Möchten Sie diese Offerte wirklich ablehnen?",
      );

    if (
      !rejectionConfirmed
    ) {
      return;
    }

    setRejecting(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/public/offers/${encodeURIComponent(
            token,
          )}/reject`,
          {
            method: "POST",
          },
        );

      const result =
        await response.json() as
          DecisionResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
            "Die Offerte konnte nicht abgelehnt werden.",
        );
      }

      router.refresh();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Die Offerte konnte nicht abgelehnt werden.",
      );
    } finally {
      setRejecting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
        Offerte und Termin
      </p>

      <h2 className="mt-3 text-2xl font-black text-white">
        Termin auswählen
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Wählen Sie zuerst einen Tag und danach eine freie Uhrzeit.
        Die Offerte wird zusammen mit dem Termin verbindlich angenommen.
      </p>

      {groups.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
          Zurzeit ist kein freier Termin verfügbar.
        </div>
      ) : (
        <>
          <div className="mt-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              1. Tag auswählen
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {visibleGroups.map(
                (group) => {
                  const active =
                    group.key ===
                    selectedDay?.key;

                  return (
                    <button
                      key={
                        group.key
                      }
                      type="button"
                      onClick={() =>
                        selectDay(
                          group.key,
                        )
                      }
                      className={[
                        "rounded-xl border px-3 py-3 text-left transition",
                        active
                          ? "border-cyan-300 bg-cyan-300/15 text-white"
                          : "border-white/10 bg-slate-950/45 text-slate-300 hover:border-cyan-300/50",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-black capitalize">
                        {formatDay(
                          group.date,
                        )}
                      </span>

                      <span className="mt-1 block text-[11px] text-slate-400">
                        {
                          group.slots
                            .length
                        } freie Zeiten
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            {visibleDayCount <
            groups.length ? (
              <button
                type="button"
                onClick={() =>
                  setVisibleDayCount(
                    groups.length,
                  )
                }
                className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-white"
              >
                Weitere Termine anzeigen
              </button>
            ) : groups.length >
              INITIAL_VISIBLE_DAYS ? (
              <button
                type="button"
                onClick={() =>
                  setVisibleDayCount(
                    INITIAL_VISIBLE_DAYS,
                  )
                }
                className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-400 transition hover:border-cyan-300/50 hover:text-white"
              >
                Weniger Termine anzeigen
              </button>
            ) : null}
          </div>

          {selectedDay ? (
            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                2. Uhrzeit auswählen
              </p>

              <p className="mt-2 text-sm font-bold capitalize text-white">
                {formatDayLong(
                  selectedDay
                    .slots[0]
                    .startAt,
                )}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedDay.slots.map(
                  (slot) => {
                    const active =
                      slot.id ===
                      selectedSlotId;

                    return (
                      <button
                        key={
                          slot.id
                        }
                        type="button"
                        onClick={() => {
                          setSelectedSlotId(
                            slot.id,
                          );

                          setConfirmed(
                            false,
                          );

                          setError("");
                        }}
                        className={[
                          "rounded-xl border px-3 py-3 text-center transition",
                          active
                            ? "border-emerald-300 bg-emerald-300/15 text-emerald-100"
                            : "border-white/10 bg-slate-950/45 text-slate-200 hover:border-emerald-300/50",
                        ].join(" ")}
                      >
                        <span className="block text-base font-black">
                          {formatTime(
                            slot.startAt,
                          )}
                        </span>

                        <span className="mt-1 block text-[11px] text-slate-400">
                          bis{" "}
                          {formatTime(
                            slot.endAt,
                          )}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}

          {selectedSlot ? (
            <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-slate-950/50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Gewählter Termin
              </p>

              <p className="mt-2 text-sm font-black capitalize text-white">
                {formatDayLong(
                  selectedSlot.startAt,
                )}
              </p>

              <p className="mt-1 text-lg font-black text-emerald-200">
                {formatTime(
                  selectedSlot.startAt,
                )}
                {" – "}
                {formatTime(
                  selectedSlot.endAt,
                )}
              </p>
            </div>
          ) : null}

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={
                !selectedSlot
              }
              onChange={(
                event,
              ) =>
                setConfirmed(
                  event.target
                    .checked,
                )
              }
              className="mt-1 h-4 w-4 accent-emerald-400"
            />

            <span className="text-sm leading-6 text-slate-300">
              Ich nehme die Offerte verbindlich an und bestätige den ausgewählten Termin.
            </span>
          </label>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-semibold text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            aria-label="Offerte und Termin verbindlich bestaetigen"
            onClick={
              acceptOffer
            }
            disabled={
              !selectedSlot ||
              !confirmed ||
              submitting ||
              rejecting
            }
            className="mt-5 w-full rounded-xl bg-emerald-300 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Wird bestätigt..."
              : "Offerte und Termin bestätigen"}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={
          rejectOffer
        }
        disabled={
          submitting ||
          rejecting
        }
        className="mt-3 w-full rounded-xl border border-red-300/20 px-5 py-3 text-sm font-bold text-red-200 transition hover:border-red-300/50 hover:bg-red-300/10 disabled:opacity-50"
      >
        {rejecting
          ? "Wird abgelehnt..."
          : "Offerte ablehnen"}
      </button>
    </section>
  );
}