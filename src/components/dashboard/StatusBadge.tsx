type StatusBadgeProps = {
  status?: string | null;
  label?: string;
};

const statusStyles: Record<string, string> = {
  NEW: "border-sky-400/30 bg-sky-400/10 text-sky-200 shadow-sky-500/10",
  OPEN: "border-sky-400/30 bg-sky-400/10 text-sky-200 shadow-sky-500/10",
  DRAFT: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200 shadow-zinc-500/10",
  SENT: "border-blue-400/30 bg-blue-400/10 text-blue-200 shadow-blue-500/10",
  ACCEPTED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 shadow-emerald-500/10",
  PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 shadow-emerald-500/10",
  PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-200 shadow-amber-500/10",
  OVERDUE: "border-red-400/30 bg-red-400/10 text-red-200 shadow-red-500/10",
  CANCELLED: "border-red-400/30 bg-red-400/10 text-red-200 shadow-red-500/10",
  COMPLETED: "border-violet-400/30 bg-violet-400/10 text-violet-200 shadow-violet-500/10",
  IN_PROGRESS: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-cyan-500/10",
};

const statusLabels: Record<string, string> = {
  NEW: "Nowe",
  OPEN: "Otwarte",
  DRAFT: "Szkic",
  SENT: "Wysłane",
  ACCEPTED: "Zaakceptowane",
  PAID: "Opłacone",
  PENDING: "Oczekuje",
  OVERDUE: "Po terminie",
  CANCELLED: "Anulowane",
  COMPLETED: "Zakończone",
  IN_PROGRESS: "W trakcie",
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalizedStatus = status?.toUpperCase() ?? "UNKNOWN";

  const style =
    statusStyles[normalizedStatus] ??
    "border-white/10 bg-white/5 text-zinc-300 shadow-white/5";

  const displayLabel =
    label ?? statusLabels[normalizedStatus] ?? normalizedStatus;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide shadow-lg ${style}`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {displayLabel}
    </span>
  );
}