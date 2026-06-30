import Link from "next/link";
import type { ReactNode } from "react";

import DashboardLogoutButton from "./DashboardLogoutButton";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "⌘",
    description: "Podsumowanie systemu",
  },
  {
    label: "Klienci",
    href: "/dashboard/customers",
    icon: "◎",
    description: "Baza klientów",
  },
  {
    label: "Zlecenia",
    href: "/dashboard/orders",
    icon: "◇",
    description: "Zamówienia i realizacje",
  },
  {
    label: "Oferty",
    href: "/dashboard/quotes",
    icon: "✦",
    description: "Wyceny i akceptacje",
  },
  {
    label: "Faktury",
    href: "/dashboard/invoices",
    icon: "▣",
    description: "Sprzedaż i dokumenty",
  },
  {
    label: "Płatności",
    href: "/dashboard/payments",
    icon: "●",
    description: "Wpłaty i rozliczenia",
  },
  {
    label: "Powiadomienia",
    href: "/dashboard/notifications",
    icon: "✉",
    description: "E-mail / SMS / system",
  },
  {
    label: "Załączniki",
    href: "/dashboard/attachments",
    icon: "▤",
    description: "Pliki i dokumenty",
  },
  {
    label: "Audit Logi",
    href: "/dashboard/audit-logs",
    icon: "◌",
    description: "Historia systemu",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34rem),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_32rem),linear-gradient(180deg,#030712_0%,#020617_45%,#000_100%)]" />

      <div className="min-h-screen lg:flex">
        <aside className="border-b border-blue-500/20 bg-black/55 p-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:p-6">
          <div className="rounded-3xl border border-blue-500/25 bg-gradient-to-br from-blue-950/50 via-neutral-950/80 to-black p-5 shadow-[0_0_45px_rgba(37,99,235,0.20)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/40 bg-blue-500/10 text-2xl font-black text-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.35)]">
                MM
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-blue-300">
                  Digital Studio
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                  Business Panel
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-neutral-400">
              Premium CRM dla firm: klienci, zlecenia, oferty, faktury,
              płatności, automatyzacje i historia systemu.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-lg font-bold text-blue-200">AI</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
                  Chatbot
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                <p className="text-lg font-bold text-cyan-200">CRM</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
                  Panel
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3">
                <p className="text-lg font-bold text-green-200">24/7</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">
                  Online
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-blue-400/60 hover:bg-blue-500/10 hover:shadow-[0_0_28px_rgba(37,99,235,0.16)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-sm font-bold text-blue-300 transition group-hover:border-blue-300/70 group-hover:text-blue-100">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-100">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            <DashboardLogoutButton />
          </div>

          <div className="mt-6 rounded-3xl border border-green-500/25 bg-green-500/10 p-4 shadow-[0_0_30px_rgba(34,197,94,0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-green-400/30 bg-green-500/10 text-green-300">
                ✓
              </div>

              <div>
                <p className="text-sm font-semibold text-green-100">
                  Panel zabezpieczony
                </p>
                <p className="mt-1 text-xs leading-5 text-green-200/70">
                  Dostęp chroniony hasłem. Gotowe pod wdrożenie jako system dla
                  klienta MM Digital Studio.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-blue-500/20 bg-blue-950/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-300">
              Powered by
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              MM Digital Studio
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Websites • AI Chatbots • Automation
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur-xl lg:px-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-blue-300">
                  MM Business OS
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
                  Panel zarządzania firmą
                </h1>
              </div>

              <div className="rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100">
                Live Dashboard • CRM • Automatyzacje
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-500/10 to-transparent" />
            <div className="relative">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}