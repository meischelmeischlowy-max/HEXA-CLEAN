"use client";

import {
  CheckCircle2,
  Circle,
  Mail,
  MessageCircle,
  CalendarDays,
  Lock,
} from "lucide-react";
import { ProgressState } from "./types";

interface Props {
  progress: ProgressState;
}

export default function ProgressPanelCompact({ progress }: Props) {
  const items = [
    ["Dienstleistung", progress.serviceLabel],
    ["Wohnfläche", progress.area ? `${progress.area} m²` : undefined],
    ["Fenster", progress.windows ? `${progress.windows} Fenster` : undefined],
    ["Etage", progress.floor],
    [
      "Lift",
      progress.elevator === true
        ? "Ja"
        : progress.elevator === false
          ? "Nein"
          : undefined,
    ],
    ["Termin", progress.date],
  ];

  return (
    <aside className="space-y-3 text-white">
      <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Ihr Auftrag
          </h3>
          <span className="text-sm font-semibold">
            {progress.progress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <h4 className="mb-3 text-sm font-bold uppercase">
            Status
          </h4>

          <div className="space-y-2.5">
            {items.map(([label, value]) => {
              const done = Boolean(value);

              return (
                <div
                  key={label}
                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-xs"
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500" />
                  )}

                  <span className="text-slate-300">{label}</span>

                  <span className="max-w-[110px] truncate text-right text-slate-400">
                    {value ?? "Noch offen"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase">
            Vorläufiger Preis
          </h3>
          <span className="text-xs text-slate-500">Geschätzt</span>
        </div>

        <div className="text-4xl font-black">
          CHF {progress.estimatedPrice ?? 0}
        </div>

        <p className="mt-1 text-sm font-semibold text-cyan-300">
          {progress.priceRange ?? "Wird berechnet"}
        </p>

        <button className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-400">
          Zusammenfassung anzeigen
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
        <h3 className="mb-3 text-sm font-bold uppercase">
          Schnellzugriff
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <a
            href="https://wa.me/41762581948"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center rounded-xl border border-white/10 p-3 text-xs text-slate-300"
          >
            <MessageCircle className="mb-2 h-6 w-6" />
            WhatsApp
          </a>

          <a
            href="mailto:meischel.meischlowy@gmail.com"
            className="flex flex-col items-center rounded-xl border border-white/10 p-3 text-xs text-slate-300"
          >
            <Mail className="mb-2 h-6 w-6" />
            E-Mail
          </a>

          <button className="flex flex-col items-center rounded-xl border border-white/10 p-3 text-xs text-slate-300">
            <CalendarDays className="mb-2 h-6 w-6" />
            Termin
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Lock className="h-4 w-4 text-cyan-300" />
          <span>Daten werden vertraulich behandelt.</span>
        </div>

        <p className="mt-2 text-right text-[11px] text-slate-500">
          by <span className="text-cyan-300">HEXA CLEAN</span>
        </p>
      </div>
    </aside>
  );
}