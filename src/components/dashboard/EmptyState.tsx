import type { ReactNode } from "react";
import PremiumButton from "./PremiumButton";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        {icon ? (
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-100 shadow-lg shadow-cyan-500/10">
            {icon}
          </div>
        ) : (
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-100 shadow-lg shadow-cyan-500/10">
            <span className="text-2xl font-black">+</span>
          </div>
        )}

        <h3 className="text-lg font-black tracking-tight text-white">
          {title}
        </h3>

        {description ? (
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {description}
          </p>
        ) : null}

        {actionLabel && actionHref ? (
          <div className="mt-6">
            <PremiumButton href={actionHref} variant="primary">
              {actionLabel}
            </PremiumButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}