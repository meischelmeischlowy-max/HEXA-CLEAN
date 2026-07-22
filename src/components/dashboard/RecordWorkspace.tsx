import type { ReactNode } from "react";

type WorkspaceTone = "neutral" | "cyan" | "amber" | "green" | "red" | "violet" | "fuchsia";

function panelToneClass(tone: WorkspaceTone) {
  if (tone === "cyan") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  if (tone === "amber") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (tone === "green") {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "red") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  if (tone === "violet") {
    return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  }

  if (tone === "fuchsia") {
    return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  }

  return "border-white/10 bg-white/[0.03] text-zinc-100";
}

function pillToneClass(tone: WorkspaceTone) {
  if (tone === "cyan") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (tone === "green") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (tone === "red") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  if (tone === "violet") return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  if (tone === "fuchsia") return "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100";
  return "border-white/10 bg-black/20 text-zinc-300";
}

export function RecordWorkspace({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Workspace
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-5xl text-sm leading-6 text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>

        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
          6 Bereiche / 1 Panel offen
        </p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export function RecordWorkspacePanel({
  id,
  eyebrow,
  title,
  description,
  meta,
  count,
  tone = "neutral",
  defaultOpen = false,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
  meta?: ReactNode;
  count?: number;
  tone?: WorkspaceTone;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      name="estimate-workspace"
      className={`group rounded-3xl border transition open:col-span-full ${panelToneClass(tone)}`}
    >
      <summary className="cursor-pointer list-none p-5 outline-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
                {eyebrow}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-white">{title}</h3>

              {typeof count === "number" ? (
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${pillToneClass(tone)}`}>
                  {count}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm leading-6 opacity-75">{description}</p>

            {meta ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold opacity-90">
                {meta}
              </div>
            ) : null}
          </div>

          <span className="w-fit rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition group-open:bg-white/10">
            <span className="group-open:hidden">Öffnen</span>
            <span className="hidden group-open:inline">Schließen</span>
          </span>
        </div>
      </summary>

      <div className="border-t border-white/10 p-5 pt-4">{children}</div>
    </details>
  );
}

export function WorkspaceMetaPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: WorkspaceTone;
}) {
  return (
    <span className={`rounded-full border px-3 py-1 ${pillToneClass(tone)}`}>
      {label}
    </span>
  );
}