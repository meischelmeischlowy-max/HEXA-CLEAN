"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import PremiumButton from "../../../components/dashboard/PremiumButton";

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ungültiges Datum";
  }

  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(date);
}

function statusLabel(status: SlotStatus) {
  switch (status) {
    case "AVAILABLE":
      return "Frei";

    case "BOOKED":
      return "Gebucht";

    case "BLOCKED":
      return "Blockiert";
  }
}

function statusClasses(status: SlotStatus) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";

    case "BOOKED":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";

    case "BLOCKED":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }
}

function slotPriority(status: SlotStatus) {
  switch (status) {
    case "BOOKED":
      return 0;

    case "BLOCKED":
      return 1;

    case "AVAILABLE":
      return 2;
  }
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busySlotId, setBusySlotId] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/dashboard/availability-slots",
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const result =
        (await response.json()) as SlotsResponse;

      if (
        !response.ok ||
        result.status !== "OK"
      ) {
        throw new Error(
          result.message ||
            "Die Termine konnten nicht geladen werden.",
        );
      }

      setSlots(result.data?.slots ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Die Termine konnten nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSlots();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSlots]);

  const sortedSlots = useMemo(() => {
    return [...slots].sort((left, right) => {
      const priorityDifference =
        slotPriority(left.status) -
        slotPriority(right.status);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        new Date(left.startAt).getTime() -
        new Date(right.startAt).getTime()
      );
    });
  }, [slots]);

  const stats = useMemo(() => {
    return slots.reduce(
      (result, slot) => {
        if (slot.status === "AVAILABLE") {
          result.available += 1;
        }

        if (slot.status === "BOOKED") {
          result.booked += 1;
        }

        if (slot.status === "BLOCKED") {
          result.blocked += 1;
        }

        return result;
      },
      {
        available: 0,
        booked: 0,
        blocked: 0,
      },
    );
  }, [slots]);

  async function createSlot() {
    setError("");
    setMessage("");

    if (!startAt || !endAt) {
      setError(
        "Bitte Beginn und Ende auswählen.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/dashboard/availability-slots",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            notes: notes.trim() || null,
          }),
        },
      );

      const result =
        (await response.json()) as {
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
      setFormOpen(false);
      setMessage(
        result.message ||
          "Der freie Termin wurde erstellt.",
      );

      await loadSlots();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Der Termin konnte nicht erstellt werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    slot: AvailabilitySlot,
    status: "AVAILABLE" | "BLOCKED",
  ) {
    setError("");
    setMessage("");
    setBusySlotId(slot.id);

    try {
      const response = await fetch(
        `/api/dashboard/availability-slots/${slot.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const result =
        (await response.json()) as {
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Der Termin konnte nicht geändert werden.",
      );
    } finally {
      setBusySlotId(null);
    }
  }

  return (
    <main className="min-h-screen px-3 py-3 text-white sm:px-4 lg:px-5">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <header className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 shadow-lg shadow-black/15">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                HEXA OS CRM / Termine
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-3">
                <h1 className="shrink-0 text-xl font-black tracking-tight text-white">
                  Termine
                </h1>

                <p className="hidden truncate text-xs text-zinc-500 lg:block">
                  Automatische Verfügbarkeit, Buchungen und blockierte Zeiten.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <PremiumButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadSlots}
                disabled={loading}
              >
                Aktualisieren
              </PremiumButton>

              <PremiumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  setFormOpen((value) => !value)
                }
              >
                {formOpen
                  ? "Formular schliessen"
                  : "Sondertermin erstellen"}
              </PremiumButton>
            </div>
          </div>

          <div
            data-testid="availability-summary-strip"
            className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3"
          >
            <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
              {slots.length} gesamt
            </span>

            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
              {stats.available} frei
            </span>

            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {stats.booked} gebucht
            </span>

            <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">
              {stats.blocked} blockiert
            </span>
          </div>
        </header>

        {formOpen ? (
          <section
            data-testid="availability-entry-form"
            className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-3"
          >
            <div className="grid gap-2 xl:grid-cols-[190px_190px_minmax(220px,1fr)_auto]">
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) =>
                  setStartAt(event.target.value)
                }
                aria-label="Beginn"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />

              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) =>
                  setEndAt(event.target.value)
                }
                aria-label="Ende"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />

              <input
                type="text"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Interne Notiz"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400"
              />

              <PremiumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={createSlot}
                disabled={
                  saving ||
                  !startAt ||
                  !endAt
                }
              >
                {saving
                  ? "Speichert..."
                  : "Termin erstellen"}
              </PremiumButton>
            </div>

            <p className="mt-2 text-[11px] text-zinc-500">
              Das Erstellen eines freien Termins versendet keine E-Mail.
            </p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm font-bold text-red-100">
            {error}
          </section>
        ) : null}

        {message ? (
          <section className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-100">
            {message}
          </section>
        ) : null}

        <section
          data-testid="availability-operational-list"
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Terminübersicht
              </p>

              <p className="mt-0.5 truncate text-xs text-zinc-500">
                Gebuchte und blockierte Zeiten stehen zuerst.
              </p>
            </div>

            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
              {sortedSlots.length} Positionen
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          ) : null}

          {!loading &&
          !error &&
          sortedSlots.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <h2 className="text-lg font-black text-white">
                Keine Termine vorhanden
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Automatische freie Termine werden beim Laden erzeugt.
              </p>
            </div>
          ) : null}

          {!loading &&
          sortedSlots.length > 0 ? (
            <div className="divide-y divide-white/10">
              {sortedSlots.map((slot) => (
                <article
                  key={slot.id}
                  className="grid gap-2 px-3 py-2.5 transition hover:bg-white/[0.03] xl:grid-cols-[150px_130px_120px_minmax(170px,0.8fr)_minmax(220px,1fr)_auto] xl:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-cyan-100">
                      {formatDate(slot.startAt)}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                      {formatTime(slot.startAt)}–{formatTime(slot.endAt)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span
                      className={`inline-flex max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${statusClasses(
                        slot.status,
                      )}`}
                    >
                      {statusLabel(slot.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      Dauer
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-zinc-300">
                      {formatTime(slot.startAt)}–{formatTime(slot.endAt)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      Auftrag
                    </p>

                    <p className="mt-0.5 truncate text-xs font-bold text-zinc-100">
                      {slot.order?.orderNumber ??
                        "Nicht gebucht"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      Notiz
                    </p>

                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {slot.notes ??
                        "Keine Notiz"}
                    </p>
                  </div>

                  <div className="xl:text-right">
                    {slot.status === "BOOKED" &&
                    slot.orderId ? (
                      <PremiumButton
                        href={`/dashboard/orders/${slot.orderId}`}
                        variant="primary"
                        size="sm"
                      >
                        Auftrag öffnen
                      </PremiumButton>
                    ) : null}

                    {slot.status === "BOOKED" &&
                    !slot.orderId ? (
                      <span className="text-xs font-bold text-zinc-500">
                        Automatisch gesperrt
                      </span>
                    ) : null}

                    {slot.status === "AVAILABLE" ? (
                      <PremiumButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          void changeStatus(
                            slot,
                            "BLOCKED",
                          )
                        }
                        disabled={
                          busySlotId === slot.id
                        }
                      >
                        Blockieren
                      </PremiumButton>
                    ) : null}

                    {slot.status === "BLOCKED" ? (
                      <PremiumButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          void changeStatus(
                            slot,
                            "AVAILABLE",
                          )
                        }
                        disabled={
                          busySlotId === slot.id
                        }
                      >
                        Freigeben
                      </PremiumButton>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}