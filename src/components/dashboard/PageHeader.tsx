import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200/80">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {children ? (
          <div className="flex flex-wrap items-center gap-3">{children}</div>
        ) : null}
      </div>
    </header>
  );
}