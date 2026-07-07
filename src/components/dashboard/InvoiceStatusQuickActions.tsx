"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvoiceStatusQuickActionsProps = {
  invoiceId: string;
  currentStatus: string;
  total: number;
  paidAmount: number;
};

type ActionButton = {
  label: string;
  status: string;
  variant: "default" | "success" | "warning" | "danger";
  setPaidFull?: boolean;
};

const actions: ActionButton[] = [
  {
    label: "Als versendet markieren",
    status: "SENT",
    variant: "default",
  },
  {
    label: "Als bezahlt markieren",
    status: "PAID",
    variant: "success",
    setPaidFull: true,
  },
  {
    label: "Teilweise bezahlt",
    status: "PARTIALLY_PAID",
    variant: "warning",
  },
  {
    label: "Überfällig",
    status: "OVERDUE",
    variant: "danger",
  },
];

function buttonClass(variant: ActionButton["variant"], active: boolean) {
  const base =
    "rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  if (active) {
    return `${base} border-white/20 bg-white/10 text-white shadow-inner shadow-white/5`;
  }

  switch (variant) {
    case "success":
      return `${base} border-emerald-400/40 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20`;
    case "warning":
      return `${base} border-amber-400/40 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20`;
    case "danger":
      return `${base} border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20`;
    default:
      return `${base} border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20`;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Entwurf";
    case "SENT":
      return "Versendet";
    case "PAID":
      return "Bezahlt";
    case "PARTIALLY_PAID":
      return "Teilweise bezahlt";
    case "OVERDUE":
      return "Überfällig";
    case "CANCELLED":
      return "Storniert";
    default:
      return status || "Kein Status";
  }
}

export default function InvoiceStatusQuickActions({
  invoiceId,
  currentStatus,
  total,
  paidAmount,
}: InvoiceStatusQuickActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(action: ActionButton) {
    setLoadingStatus(action.status);
    setMessage(null);
    setError(null);

    const payload: {
      status: string;
      paidAmount?: number;
    } = {
      status: action.status,
    };

    if (action.setPaidFull) {
      payload.paidAmount = total;
    }

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setMessage("Der Rechnungsstatus wurde gespeichert.");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Der Rechnungsstatus konnte nicht gespeichert werden.");
    } finally {
      setLoadingStatus(null);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
            Rechnungsstatus
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Schnelle Zahlungsaktionen
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Aktualny status:{" "}
            <span className="font-semibold text-white">
              {statusLabel(currentStatus)}
            </span>{" "}
            · Bezahlt:{" "}
            <span className="font-semibold text-emerald-300">
              {paidAmount.toFixed(2)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {actions.map((action) => {
            const active = currentStatus === action.status;
            const loading = loadingStatus === action.status;

            return (
              <button
                key={action.status}
                type="button"
                disabled={loadingStatus !== null || active}
                onClick={() => updateStatus(action)}
                className={buttonClass(action.variant, active)}
              >
                {loading ? "Wird gespeichert..." : active ? "Aktiv" : action.label}
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}