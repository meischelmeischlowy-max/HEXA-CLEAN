import type { ReactNode } from "react";

type DashboardPanelProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function DashboardPanel({
  title,
  description,
  action,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/75 shadow-2xl shadow-black/30 backdrop-blur ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-cyan-500/5 blur-3xl" />

      {(title || description || action) ? (
        <div className="relative flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-black tracking-tight text-white">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>

          {action ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative p-5">{children}</div>
    </section>
  );
}