import Link from "next/link";
import type { ActionTone } from "../../lib/dashboard/next-action";

function toneClass(tone: ActionTone) {
  if (tone === "green") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20";
  }

  if (tone === "amber") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20";
  }

  if (tone === "red") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20";
  }

  if (tone === "cyan") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]";
}

export default function ActionStatusBadge({
  label,
  tone,
  href,
  title,
}: {
  label: string;
  tone: ActionTone;
  href?: string;
  title?: string;
}) {
  const className = `inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] transition ${toneClass(
    tone,
  )}`;

  const content = (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <span title={title} className={className}>
      {content}
    </span>
  );
}