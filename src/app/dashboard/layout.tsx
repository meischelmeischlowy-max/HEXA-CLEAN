import Link from "next/link";
import type { ReactNode } from "react";
import DashboardLogoutButton from "./DashboardLogoutButton";

const navItems = [
  {
    label: "Übersicht",
    href: "/dashboard",
    description: "Zentrale Systemübersicht",
    marker: "OS",
  },
  {
    label: "Kunden",
    href: "/dashboard/customers",
    description: "CRM und Kontakte",
    marker: "CRM",
  },
  {
    label: "Aufträge",
    href: "/dashboard/orders",
    description: "Arbeiten und Einsätze",
    marker: "JOB",
  },
  {
    label: "Kalkulationen",
    href: "/dashboard/estimates",
    description: "Preise und interne Berechnung",
    marker: "EST",
  },
  {
    label: "Angebote",
    href: "/dashboard/quotes",
    description: "Angebote für Kunden",
    marker: "CHF",
  },
  {
    label: "Rechnungen",
    href: "/dashboard/invoices",
    description: "Verkaufsdokumente",
    marker: "INV",
  },
  {
    label: "Zahlungen",
    href: "/dashboard/payments",
    description: "Zahlungseingänge",
    marker: "PAY",
  },
  {
    label: "Leistungen",
    href: "/dashboard/services",
    description: "Services und Preise",
    marker: "SVC",
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit-logs",
    description: "Systemhistorie",
    marker: "LOG",
  },
];

const futureItems = [
  {
    label: "AI Concierge",
    description: "Chatbot, Sitzungen, Anfragen",
  },
  {
    label: "Automatisierung",
    description: "E-Mail, SMS, Workflow",
  },
  {
    label: "Vision AI",
    description: "Fotos, Risiko, Analyse",
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl lg:block">
          <div className="flex h-full flex-col">
            <Link
              href="/dashboard"
              className="group relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-2xl shadow-cyan-500/10 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl transition group-hover:bg-cyan-300/20" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-black/30 text-sm font-black tracking-tight text-cyan-100">
                  H
                </div>

                <div>
                  <p className="text-lg font-black tracking-tight text-white">
                    HEXA OS
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/70">
                    Betriebs-Panel
                  </p>
                </div>
              </div>
            </Link>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
              <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                Systemmodule
              </p>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-cyan-400/20 hover:bg-cyan-400/10"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-zinc-300 transition group-hover:border-cyan-300/30 group-hover:bg-cyan-400/10 group-hover:text-cyan-100">
                      {item.marker}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold tracking-tight text-zinc-100 transition group-hover:text-white">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 transition group-hover:text-cyan-100/70">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-3">
              <p className="px-3 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                Erweiterung
              </p>

              <div className="space-y-2">
                {futureItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                  >
                    <div>
                      <p className="font-bold tracking-tight text-zinc-300">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {item.description}
                      </p>
                    </div>

                    <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                      bald
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-emerald-100">
                    System online
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                    CRM, Leistungen, Angebote, Rechnungen und Workflow sind aktiv.
                  </p>
                </div>

                <div className="h-3 w-3 rounded-full bg-emerald-300 shadow-lg shadow-emerald-400/60" />
              </div>

              <div className="mt-4">
                <DashboardLogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/85 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-sm font-black text-cyan-100">
                  H
                </div>

                <div>
                  <p className="font-black tracking-tight text-white">
                    HEXA OS
                  </p>
                  <p className="text-xs text-zinc-500">Betriebs-Panel</p>
                </div>
              </Link>

              <DashboardLogoutButton />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}