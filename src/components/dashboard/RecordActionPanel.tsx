import Link from "next/link";
import type { DashboardRecordAction } from "../../lib/dashboard/next-action";
import { getToneClassName } from "../../lib/dashboard/next-action";

function ActionButton({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  const className = primary
    ? "w-fit rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/25"
    : "w-fit rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-white/10";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

export default function RecordActionPanel({
  action,
  eyebrow = "Naechste Aktion",
}: {
  action: DashboardRecordAction;
  eyebrow?: string;
}) {
  return (
    <section className={`rounded-3xl border p-5 ${getToneClassName(action.tone)}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">
            {eyebrow}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black text-white">{action.title}</h2>

            <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.12em]">
              {action.label}
            </span>
          </div>

          <p className="mt-2 max-w-4xl text-sm leading-6 opacity-80">
            {action.description}
          </p>

          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] opacity-50">
            Besitzer der Aktion: {action.owner}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton href={action.href} label={action.primaryLabel} primary />

          {action.secondaryHref && action.secondaryLabel ? (
            <ActionButton href={action.secondaryHref} label={action.secondaryLabel} />
          ) : null}
        </div>
      </div>
    </section>
  );
}