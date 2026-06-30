import type { ReactNode } from "react";
import StatusBadge from "./StatusBadge";

type ActivityTimelineItem = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  time?: string | null;
  icon?: ReactNode;
};

type ActivityTimelineProps = {
  items: ActivityTimelineItem[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export default function ActivityTimeline({
  items,
  emptyTitle = "Brak aktywności",
  emptyDescription = "Gdy pojawią się nowe akcje w CRM, zobaczysz je tutaj.",
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
        <p className="text-sm font-bold text-white">{emptyTitle}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-100 shadow-lg shadow-cyan-500/10">
              {item.icon ?? <span className="text-sm font-black">{index + 1}</span>}
            </div>

            {index < items.length - 1 ? (
              <div className="mt-3 h-full w-px min-h-8 bg-gradient-to-b from-cyan-300/40 to-transparent" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold tracking-tight text-white">{item.title}</p>

                {item.description ? (
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {item.description}
                  </p>
                ) : null}

                {item.time ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {item.time}
                  </p>
                ) : null}
              </div>

              {item.status ? (
                <div className="shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}