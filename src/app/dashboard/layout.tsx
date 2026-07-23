import Link from "next/link";
import type { ReactNode } from "react";
import DashboardLogoutButton from "./DashboardLogoutButton";
import DashboardNavigationLink from "./DashboardNavigationLink";

const workItems = [
  {
    label: "Cockpit",
    href: "/dashboard",
    description: "Uebersicht und nächste Schritte",
  },
  {
    label: "Kunden",
    href: "/dashboard/customers",
    description: "Kontakte, Verlauf und Kundendaten",
  },
  {
    label: "Aufträge",
    href: "/dashboard/orders",
    description: "Arbeiten planen und verfolgen",
  },
  {
    label: "Termine",
    href: "/dashboard/availability",
    description: "Freie Zeiten planen und blockieren",
  },
  {
    label: "Kalkulationen",
    href: "/dashboard/estimates",
    description: "Berechnen, prüfen und freigeben",
  },
  {
    label: "Offerten",
    href: "/dashboard/quotes",
    description: "Angebote, Kundenlink und Antwort",
  },
  {
    label: "Rechnungen",
    href: "/dashboard/invoices",
    description: "Rechnungen erstellen und kontrollieren",
  },
  {
    label: "Zahlungen",
    href: "/dashboard/payments",
    description: "Zahlungseingaenge und Status",
  },
];

const secondaryItems = [
  {
    label: "Dateien",
    href: "/dashboard/attachments",
    description: "Fotos, Uploads und Dokumente",
  },
  {
    label: "Leistungen",
    href: "/dashboard/services",
    description: "Services und Preise",
  },
];

const systemItems = [
  {
    label: "Sicherheit",
    href: "/dashboard/security",
    description: "Schutz, Public Logs und Zugriffe",
  },
  {
    label: "Benachrichtigungen",
    href: "/dashboard/notifications",
    description: "Systemmeldungen und Versand",
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit-logs",
    description: "Technischer Verlauf",
  },
];

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-2.5">
      <p className="px-2.5 pb-2 pt-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </p>

      <div className="grid gap-1.5">{children}</div>
    </section>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-white/10 bg-neutral-950 p-3 lg:block">
      <div className="sticky top-3 grid gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] px-3.5 py-3 transition hover:border-cyan-300/40 hover:bg-cyan-400/12"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-sm font-black text-cyan-100">
            H
          </span>

          <span className="min-w-0">
            <span className="block text-xs font-black uppercase tracking-[0.26em] text-cyan-300">
              HEXA OS
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500">
              Automatisierter Betrieb
            </span>
          </span>
        </Link>

        <SidebarSection title="Taegliche Arbeit">
          {workItems.map((item) => (
            <DashboardNavigationLink
              key={item.href}
              href={item.href}
              label={item.label}
              description={item.description}
            />
          ))}
        </SidebarSection>

        <details className="rounded-3xl border border-white/10 bg-white/[0.025] p-3">
          <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-neutral-500 transition hover:text-neutral-300">
            Weitere Bereiche
          </summary>

          <div className="mt-3 grid gap-2">
            {secondaryItems.map((item) => (
              <DashboardNavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.description}
              />
            ))}
          </div>
        </details>

        <details className="rounded-3xl border border-amber-400/15 bg-amber-400/[0.03] p-3">
          <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-amber-200/70 transition hover:text-amber-100">
            System / Technik
          </summary>

          <div className="mt-3 grid gap-2">
            {systemItems.map((item) => (
              <DashboardNavigationLink
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.description}
              />
            ))}
          </div>

          <p className="mt-4 px-3 text-xs leading-5 text-neutral-600">
            Logs, Security und technische Nachweise bleiben hier gesammelt.
          </p>
        </details>

        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-black text-emerald-100">System online</p>
          <p className="mt-1 text-xs leading-5 text-emerald-100/70">
            CRM, Offerten, Rechnungen und Sicherheitsfunktionen sind aktiv.
          </p>

          <div className="mt-4">
            <DashboardLogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-sm font-black text-cyan-100">
            H
          </div>

          <div>
            <p className="font-black tracking-tight text-white">HEXA OS</p>
            <p className="text-xs text-neutral-500">Cockpit</p>
          </div>
        </Link>

        <DashboardLogoutButton />
      </div>

      <details className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
          Menu
        </summary>

        <nav className="mt-3 grid gap-2">
          {workItems.map((item) => (
            <DashboardNavigationLink
              key={item.href}
              href={item.href}
              label={item.label}
              description={item.description}
            />
          ))}

          <details className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              Weitere Bereiche
            </summary>

            <div className="mt-3 grid gap-2">
              {secondaryItems.map((item) => (
                <DashboardNavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </div>
          </details>

          <details className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.03] p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.2em] text-amber-200/70">
              System / Technik
            </summary>

            <div className="mt-3 grid gap-2">
              {systemItems.map((item) => (
                <DashboardNavigationLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                />
              ))}
            </div>
          </details>
        </nav>
      </details>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-950 text-white">
      <div className="flex min-h-screen min-w-0">
        <DesktopSidebar />

        <div className="min-w-0 flex-1">
          <MobileHeader />

          <main className="w-full min-w-0 overflow-x-hidden">
            <div className="w-full min-w-0 max-w-none">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}