"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SlotStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "BLOCKED";

type AvailabilitySlot = {
  id: string;
  startAt: string;
  endAt: string;
  status: SlotStatus;
  notes?: string | null;
  orderId?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  } | null;
};

type SlotsResponse = {
  status: string;
  message?: string;
  data?: {
    slots?: AvailabilitySlot[];
  };
};

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Zurich",
    },
  ).format(date);
}

function statusLabel(
  status: SlotStatus,
) {
  const labels: Record<
    SlotStatus,
    string
  > = {
    AVAILABLE: "Frei",
    BOOKED: "Gebucht",
    BLOCKED: "Blockiert",
  };

  return labels[status];
}

function statusClasses(
  status: SlotStatus,
) {
  if (
    status === "AVAILABLE"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  }

  if (
    status === "BOOKED"
  ) {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export default function AvailabilityPage() {
  const [
    slots,
    setSlots,
  ] = useState<
    AvailabilitySlot[]
  >([]);

  const [
    startAt,
    setStartAt,
  ] = useState("");

  const [
    endAt,
    setEndAt,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const loadSlots =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/dashboard/availability-slots",
              {
                cache:
                  "no-store",
                credentials:
                  "include",
              },
            );

          const result =
            await response.json() as SlotsResponse;

          if (
            !response.ok ||
            result.status !==
              "OK"
          ) {
            throw new Error(
              result.message ||
                "Die Termine konnten nicht geladen werden.",
            );
          }

          setSlots(
            result.data
              ?.slots ??
              [],
          );
        } catch (
          caughtError
        ) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Unbekannter Fehler",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadSlots();
      }, 0);

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [loadSlots]);

  const stats =
    useMemo(() => {
      return {
        all:
          slots.length,
        available:
          slots.filter(
            (slot) =>
              slot.status ===
              "AVAILABLE",
          ).length,
        booked:
          slots.filter(
            (slot) =>
              slot.status ===
              "BOOKED",
          ).length,
        blocked:
          slots.filter(
            (slot) =>
              slot.status ===
              "BLOCKED",
          ).length,
      };
    }, [slots]);

  async function createSlot() {
    setError("");
    setMessage("");

    if (
      !startAt ||
      !endAt
    ) {
      setError(
        "Bitte Start und Ende auswählen.",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/dashboard/availability-slots",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                startAt:
                  new Date(
                    startAt,
                  ).toISOString(),
                endAt:
                  new Date(
                    endAt,
                  ).toISOString(),
                notes:
                  notes.trim() ||
                  null,
              }),
          },
        );

      const result =
        await response.json() as {
          status: string;
          message?: string;
        };

      if (
        !response.ok ||
        result.status !== "OK"
      ) {
        throw new Error(
          result.message ||
            "Der Termin konnte nicht erstellt werden.",
        );
      }

      setStartAt("");
      setEndAt("");
      setNotes("");
      setMessage(
        result.message ||
          "Der freie Termin wurde erstellt.",
      );

      await loadSlots();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Unbekannter Fehler",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    slot: AvailabilitySlot,
    status:
      | "AVAILABLE"
      | "BLOCKED",
  ) {
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/dashboard/availability-slots/${slot.id}`,
          {
            method: "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                status,
              }),
          },
        );

      const result =
        await response.json() as {
          status: string;
          message?: string;
        };

      if (
        !response.ok ||
        result.status !== "OK"
      ) {
        throw new Error(
          result.message ||
            "Der Termin konnte nicht geändert werden.",
        );
      }

      setMessage(
        result.message ||
          "Der Termin wurde geändert.",
      );

      await loadSlots();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Unbekannter Fehler",
      );
    }
  }

  async function deleteSlot(
    slot: AvailabilitySlot,
  ) {
    setError("");
    setMessage("");

    const confirmed =
      window.confirm(
        `Termin ${formatDateTime(
          slot.startAt,
        )} wirklich löschen?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/dashboard/availability-slots/${slot.id}`,
          {
            method:
              "DELETE",
            credentials:
              "include",
          },
        );

      const result =
        await response.json() as {
          status: string;
          message?: string;
        };

      if (
        !response.ok ||
        result.status !== "OK"
      ) {
        throw new Error(
          result.message ||
            "Der Termin konnte nicht gelöscht werden.",
        );
      }

      setMessage(
        result.message ||
          "Der Termin wurde gelöscht.",
      );

      await loadSlots();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Unbekannter Fehler",
      );
    }
  }

  return (
    <main className="min-h-screen p-6 text-white lg:p-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">
          HEXA OS / Termine
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Freie Kundentermine – automatisch
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          Das System erstellt freie Termine automatisch von Montag bis Samstag, jeweils von 08:00 bis 18:00 Uhr.
          Gebuchte Aufträge und blockierte Zeiten werden automatisch abgezogen.
          Das Erstellen oder Blockieren eines Termins versendet keine E-Mail.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Alle",
              stats.all,
            ],
            [
              "Frei",
              stats.available,
            ],
            [
              "Gebucht",
              stats.booked,
            ],
            [
              "Blockiert",
              stats.blocked,
            ],
          ].map(
            ([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black">
                  {value}
                </p>
              </div>
            ),
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
          <h2 className="text-xl font-black">
            Zusätzlichen Sondertermin hinzufügen
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              Beginn

              <input
                type="datetime-local"
                value={startAt}
                onChange={(
                  event,
                ) =>
                  setStartAt(
                    event.target
                      .value,
                  )
                }
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Ende

              <input
                type="datetime-local"
                value={endAt}
                onChange={(
                  event,
                ) =>
                  setEndAt(
                    event.target
                      .value,
                  )
                }
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Interne Notiz

              <input
                type="text"
                value={notes}
                onChange={(
                  event,
                ) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                placeholder="Optional"
                className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={
              createSlot
            }
            disabled={saving}
            className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-neutral-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {saving
              ? "Wird gespeichert..."
              : "Termin veröffentlichen"}
          </button>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {message}
          </div>
        ) : null}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                Terminliste
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Gebuchte Termine sind gegen manuelle Änderung und Löschung geschützt.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadSlots()
              }
              disabled={loading}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-bold text-neutral-200 transition hover:border-cyan-400"
            >
              Aktualisieren
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-neutral-500">
              Termine werden geladen...
            </p>
          ) : slots.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-500">
              Noch keine freien Termine vorhanden.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Beginn
                    </th>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Ende
                    </th>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Status
                    </th>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Auftrag
                    </th>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Notiz
                    </th>
                    <th className="border-b border-neutral-800 px-3 py-3">
                      Aktionen
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {slots.map(
                    (slot) => (
                      <tr
                        key={slot.id}
                        className="border-b border-neutral-800"
                      >
                        <td className="px-3 py-4 font-semibold text-white">
                          {formatDateTime(
                            slot.startAt,
                          )}
                        </td>

                        <td className="px-3 py-4 text-neutral-300">
                          {formatDateTime(
                            slot.endAt,
                          )}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses(
                              slot.status,
                            )}`}
                          >
                            {statusLabel(
                              slot.status,
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-neutral-300">
                          {slot.order
                            ?.orderNumber ??
                            "?"}
                        </td>

                        <td className="max-w-[260px] px-3 py-4 text-neutral-400">
                          {slot.notes ??
                            "?"}
                        </td>

                        <td className="px-3 py-4">
                          {slot.status ===
                          "BOOKED" ? (
                            <span className="text-xs text-neutral-500">
                              Durch Buchung gesperrt
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slot.status ===
                              "AVAILABLE" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void changeStatus(
                                      slot,
                                      "BLOCKED",
                                    )
                                  }
                                  className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-100"
                                >
                                  Blockieren
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void changeStatus(
                                      slot,
                                      "AVAILABLE",
                                    )
                                  }
                                  className="rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-bold text-emerald-100"
                                >
                                  Freigeben
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteSlot(
                                    slot,
                                  )
                                }
                                className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-bold text-red-100"
                              >
                                Löschen
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

