import type { ReactNode } from "react";

type MetricCardTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "blue"
  | "red"
  | "zinc";

type MetricCardProps = {
  title: string;
  value: string;
  description?: string;
  trend?: string;
  icon?: ReactNode;
  tone?: MetricCardTone;
};

const toneStyles: Record<
  MetricCardTone,
  {
    border: string;
    glow: string;
    icon: string;
    trend: string;
  }
> = {
  cyan: {
    border: "border-cyan-400/20",
    glow: "shadow-cyan-500/10",
    icon: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    trend: "text-cyan-200",
  },
  emerald: {
    border: "border-emerald-400/20",
    glow: "shadow-emerald-500/10",
    icon: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    trend: "text-emerald-200",
  },
  amber: {
    border: "border-amber-400/20",
    glow: "shadow-amber-500/10",
    icon: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    trend: "text-amber-200",
  },
  violet: {
    border: "border-violet-400/20",
    glow: "shadow-violet-500/10",
    icon: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    trend: "text-violet-200",
  },
  blue: {
    border: "border-blue-400/20",
    glow: "shadow-blue-500/10",
    icon: "border-blue-400/25 bg-blue-400/10 text-blue-200",
    trend: "text-blue-200",
  },
  red: {
    border: "border-red-400/20",
    glow: "shadow-red-500/10",
    icon: "border-red-400/25 bg-red-400/10 text-red-200",
    trend: "text-red-200",
  },
  zinc: {
    border: "border-white/10",
    glow: "shadow-black/20",
    icon: "border-white/10 bg-white/5 text-zinc-200",
    trend: "text-zinc-200",
  },
};

export default function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  tone = "zinc",
}: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <section
      className={`group relative overflow-hidden rounded-3xl border ${styles.border} bg-zinc-950/70 p-5 shadow-2xl ${styles.glow} backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-900/80`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/5 blur-3xl transition duration-300 group-hover:bg-white/10" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-white">
            {value}
          </p>

          {description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${styles.icon}`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {trend ? (
        <div className="relative mt-5 border-t border-white/10 pt-4">
          <p className={`text-xs font-semibold ${styles.trend}`}>{trend}</p>
        </div>
      ) : null}
    </section>
  );
}