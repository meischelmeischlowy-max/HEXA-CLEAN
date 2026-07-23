"use client";

import {
  CheckCircle2,
  Circle,
  Mail,
  MessageCircle,
  CalendarDays,
  Lock,
  Send,
} from "lucide-react";
import { ProgressState } from "./types";

interface ProgressPanelProps {
  progress: ProgressState;
}

export default function ProgressPanel({ progress }: ProgressPanelProps) {
  const completed = progress.progress >= 100;

  if (completed) {
    return <FinalOfferPanel progress={progress} />;
  }

  const statusItems = [
    {
      label: "Dienstleistung",
      value: progress.serviceLabel ?? "Noch offen",
      done: Boolean(progress.serviceLabel),
    },
    {
      label: "WohnflĂ¤che",
      value: progress.area ? `${progress.area} mÂ˛` : "Noch offen",
      done: Boolean(progress.area),
    },
    {
      label: "Fenster",
      value: progress.windows ? `${progress.windows} Fenster` : "Noch offen",
      done: Boolean(progress.windows),
    },
    {
      label: "Etage",
      value: progress.floor ?? "Noch offen",
      done: Boolean(progress.floor),
    },
    {
      label: "Lift",
      value:
        progress.elevator === true
          ? "Ja"
          : progress.elevator === false
            ? "Nein"
            : "Noch offen",
      done: progress.elevator !== undefined,
    },
    {
      label: "Termin",
      value: progress.date ?? "Noch offen",
      done: Boolean(progress.date),
    },
  ];

  return (
    <aside className="flex flex-col gap-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold uppercase tracking-wide text-white">
            Ihr Auftrag
          </h3>

          <span className="text-lg font-semibold text-white">
            {progress.progress}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <h4 className="mb-5 text-lg font-semibold text-white">
            Status Zusammenfassung
          </h4>

          <div className="space-y-4">
            {statusItems.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </div>

                <span className="text-slate-300">{item.label}</span>

                <span className="text-right text-slate-400">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PricePanel progress={progress} />
      <QuickAccess />
      <SecurityNote />
    </aside>
  );
}

function FinalOfferPanel({ progress }: { progress: ProgressState }) {
  const rows = [
    {
      label: "Dienstleistung",
      value: progress.serviceLabel,
      show: Boolean(progress.serviceLabel),
    },
    {
      label: "WohnflĂ¤che",
      value: progress.area ? `${progress.area} mÂ˛` : undefined,
      show: Boolean(progress.area),
    },
    {
      label: "Fenster",
      value:
        progress.windows !== undefined
          ? `${progress.windows} Fenster`
          : undefined,
      show: progress.windows !== undefined,
    },
    {
      label: "Etage",
      value: progress.floor,
      show: Boolean(progress.floor),
    },
    {
      label: "Lift",
      value:
        progress.elevator === true
          ? "Ja"
          : progress.elevator === false
            ? "Nein"
            : undefined,
      show: progress.elevator !== undefined,
    },
    {
      label: "Termin",
      value: progress.date,
      show: Boolean(progress.date),
    },
  ];

  return (
    <aside className="flex flex-col gap-5">
      <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Ihre Offerte
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            Zusammenfassung
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Unverbindliche ErsteinschĂ¤tzung auf Basis Ihrer Angaben.
          </p>
        </div>

        <div className="space-y-4">
          {rows
            .filter((row) => row.show)
            .map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-5 border-b border-white/10 pb-3 text-sm"
              >
                <span className="text-slate-400">{row.label}</span>
                <span className="text-right font-semibold text-white">
                  {row.value}
                </span>
              </div>
            ))}
        </div>

        <div className="mt-7 rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Richtpreis
          </div>

          <div className="mt-2 text-4xl font-black text-white">
            {progress.priceRange ?? "Wird berechnet"}
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Der finale Preis wird nach kurzer PrĂĽfung verbindlich bestĂ¤tigt.
          </p>
        </div>

        <button className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-5 py-4 font-bold text-white transition hover:bg-cyan-400">
          <Send className="h-5 w-5" />
          Anfrage senden
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="mb-5 text-lg font-bold uppercase tracking-wide text-white">
          Warum HEXA CLEAN?
        </h3>

        <div className="space-y-3 text-sm text-slate-300">
          <Benefit text="Unverbindliche Offerte" />
          <Benefit text="Flexible Termine" />
          <Benefit text="Transparente Richtpreise" />
          <Benefit text="PersĂ¶nliche RĂĽckmeldung" />
        </div>
      </div>

      <QuickAccess />
      <SecurityNote />
    </aside>
  );
}

function PricePanel({ progress }: { progress: ProgressState }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wide text-white">
          VorlĂ¤ufiger Preis
        </h3>

        <span className="text-sm text-slate-500">GeschĂ¤tzt</span>
      </div>

      <div className="text-5xl font-black text-white">
        CHF {progress.estimatedPrice ?? 0}
      </div>

      <p className="mt-3 text-lg font-semibold text-cyan-300">
        {progress.priceRange ?? "Wird berechnet"}
      </p>

      <p className="mt-3 text-sm text-slate-500">
        Angebot wird in Echtzeit berechnet.
      </p>

      <button className="mt-7 flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-5 py-4 font-semibold text-white transition hover:bg-cyan-400">
        Zusammenfassung anzeigen
      </button>
    </div>
  );
}

function QuickAccess() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="mb-5 text-lg font-bold uppercase tracking-wide text-white">
        Schnellzugriff
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <a
          href="https://wa.me/41762581948"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          <MessageCircle className="mb-3 h-8 w-8" />
          WhatsApp
        </a>

        <a
          href="mailto:info@hexaclean.ch"
          className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
        >
          <Mail className="mb-3 h-8 w-8" />
          E-Mail
        </a>

        <button className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300">
          <CalendarDays className="mb-3 h-8 w-8" />
          Termin
        </button>
      </div>
    </div>
  );
}

function SecurityNote() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Lock className="h-5 w-5 text-cyan-300" />
        <span>Ihre Daten sind sicher und werden vertraulich behandelt.</span>
      </div>

      <p className="mt-3 text-right text-xs text-slate-500">
        by <span className="text-cyan-300">HEXA CLEAN</span>
      </p>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 text-cyan-300" />
      <span>{text}</span>
    </div>
  );
}
