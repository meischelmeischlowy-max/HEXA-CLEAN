"use client";

import {
  Children,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type PanelTone =
  | "neutral"
  | "cyan"
  | "amber"
  | "green"
  | "red"
  | "violet"
  | "fuchsia";

export type RecordDrawerPanel = {
  id: string;
  eyebrow?: string;
  title: string;
  description: string;
  tone?: PanelTone;
  count?: number;
  meta?: string[];
};

function toneCardClass(tone: PanelTone = "neutral") {
  if (tone === "cyan") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-300/15";
  }

  if (tone === "amber") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:border-amber-300/50 hover:bg-amber-300/15";
  }

  if (tone === "green") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-300/15";
  }

  if (tone === "red") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:border-rose-300/50 hover:bg-rose-300/15";
  }

  if (tone === "violet") {
    return "border-violet-300/25 bg-violet-300/10 text-violet-100 hover:border-violet-300/50 hover:bg-violet-300/15";
  }

  if (tone === "fuchsia") {
    return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100 hover:border-fuchsia-300/50 hover:bg-fuchsia-300/15";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-100 hover:border-white/20 hover:bg-white/[0.06]";
}

function tonePillClass(tone: PanelTone = "neutral") {
  if (tone === "cyan") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (tone === "green") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (tone === "red") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  if (tone === "violet") return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  if (tone === "fuchsia") return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  return "border-white/10 bg-black/20 text-zinc-300";
}

export default function RecordDrawerWorkspace({
  title,
  description,
  panels,
  children,
}: {
  title: string;
  description: string;
  panels: RecordDrawerPanel[];
  children: ReactNode;
}) {
  const panelContent = useMemo(() => Children.toArray(children), [children]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);

  const activePanelIndex = activePanelId
    ? panels.findIndex((panel) => panel.id === activePanelId)
    : -1;

  const activePanel =
    activePanelIndex >= 0 ? panels[activePanelIndex] : null;

  const activeContent =
    activePanelIndex >= 0 ? panelContent[activePanelIndex] : null;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePanelId(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!activePanelId) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [activePanelId]);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Workspace
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          Panel oeffnen statt Seite durchsuchen
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setActivePanelId(panel.id)}
            className={`min-h-[190px] rounded-3xl border p-5 text-left transition ${toneCardClass(
              panel.tone,
            )}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {panel.eyebrow ? (
                  <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                    {panel.eyebrow}
                  </p>
                ) : null}

                <h3 className="mt-2 text-xl font-black text-white">
                  {panel.title}
                </h3>
              </div>

              {typeof panel.count === "number" ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${tonePillClass(
                    panel.tone,
                  )}`}
                >
                  {panel.count}
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-6 opacity-75">
              {panel.description}
            </p>

            {panel.meta?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {panel.meta.map((item) => (
                  <span
                    key={item}
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${tonePillClass(
                      panel.tone,
                    )}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 inline-flex rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
              Oeffnen
            </div>
          </button>
        ))}
      </div>

      {activePanel ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Panel schliessen"
            className="absolute inset-0 cursor-default"
            onClick={() => setActivePanelId(null)}
          />

          <aside className="relative z-10 flex h-full w-full max-w-6xl flex-col border-l border-white/10 bg-neutral-950 shadow-2xl">
            <div className={`border-b p-5 ${toneCardClass(activePanel.tone)}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  {activePanel.eyebrow ? (
                    <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                      {activePanel.eyebrow}
                    </p>
                  ) : null}

                  <h2 className="mt-2 text-2xl font-black text-white">
                    {activePanel.title}
                  </h2>

                  <p className="mt-2 max-w-4xl text-sm leading-6 opacity-75">
                    {activePanel.description}
                  </p>

                  {activePanel.meta?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activePanel.meta.map((item) => (
                        <span
                          key={item}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${tonePillClass(
                            activePanel.tone,
                          )}`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setActivePanelId(null)}
                  className="rounded-2xl border border-white/15 bg-black/30 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Schliessen
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{activeContent}</div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}