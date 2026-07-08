import Link from "next/link";

import DashboardPanel from "../../components/dashboard/DashboardPanel";
import MetricCard from "../../components/dashboard/MetricCard";
import PageHeader from "../../components/dashboard/PageHeader";
import PremiumButton from "../../components/dashboard/PremiumButton";
import StatusBadge from "../../components/dashboard/StatusBadge";

const workQueues = [
  {
    title: "Neue Anfragen",
    value: "Prüfen",
    description:
      "Neue Kundenanfragen aus Formular, QuickOffer oder AI Chat zuerst hier bearbeiten.",
    href: "/dashboard/estimates",
    action: "Anfragen prüfen",
    status: "OPEN",
    tone: "cyan" as const,
  },
  {
    title: "Zu prüfen",
    value: "Review",
    description:
      "Kalkulationen mit AI_REVIEW, fehlenden Fotos oder manuellem Prüfbedarf.",
    href: "/dashboard/estimates",
    action: "Kalkulationen öffnen",
    status: "IN_PROGRESS",
    tone: "amber" as const,
  },
  {
    title: "Bereit zum Senden",
    value: "Offerte",
    description:
      "Freigegebene Offerten, die an den Kunden geschickt oder per Link geteilt werden können.",
    href: "/dashboard/quotes",
    action: "Offerten öffnen",
    status: "SENT",
    tone: "emerald" as const,
  },
  {
    title: "Wartet auf Kunde",
    value: "Antwort",
    description:
      "Gesendete Offerten, öffentliche Kundenlinks und ausstehende Entscheidungen.",
    href: "/dashboard/quotes",
    action: "Kundenstatus prüfen",
    status: "PENDING",
    tone: "violet" as const,
  },
];

const nextActions = [
  {
    title: "Neue Anfrage bearbeiten",
    description:
      "Kundendaten prüfen, fehlende Informationen ergänzen und Kalkulation freigeben.",
    href: "/dashboard/estimates",
    label: "Kalkulationen",
    status: "OPEN",
  },
  {
    title: "Kundenlink senden",
    description:
      "Eine Offerte öffnen, öffentlichen Link erstellen und Kunde entscheiden lassen.",
    href: "/dashboard/quotes",
    label: "Offerten",
    status: "SENT",
  },
  {
    title: "Akzeptierte Offerte abrechnen",
    description:
      "Nach Annahme der Offerte die Rechnung erstellen und Zahlung verfolgen.",
    href: "/dashboard/invoices",
    label: "Rechnungen",
    status: "ACCEPTED",
  },
];

const workflow = [
  {
    title: "1. Anfrage",
    description: "Kunde fragt an. System legt Kunde, Auftrag und Kalkulation an.",
  },
  {
    title: "2. Prüfung",
    description: "Kalkulation prüfen, Fotos kontrollieren, Offerte vorbereiten.",
  },
  {
    title: "3. Offerte",
    description: "Offerte senden, Kundenlink nutzen, Uploads sammeln.",
  },
  {
    title: "4. Entscheidung",
    description: "Kunde akzeptiert oder lehnt ab. System protokolliert im Hintergrund.",
  },
  {
    title: "5. Rechnung",
    description: "Aus akzeptierter Offerte wird Rechnung und Zahlungskontrolle.",
  },
];

const backgroundAutomation = [
  "Audit Log",
  "Security Logging",
  "Notification Status",
  "Public Access Logs",
  "Token-Prüfung",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="HEXA OS / Cockpit"
          title="Arbeitszentrale"
          description="Hier zählt nur, was als Nächstes zu tun ist. Technische Logs, IDs und Systemdetails laufen im Hintergrund."
        >
          <PremiumButton href="/dashboard/estimates" variant="primary">
            Offene Arbeit prüfen
          </PremiumButton>
          <PremiumButton href="/dashboard/quotes" variant="secondary">
            Offerten öffnen
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workQueues.map((queue) => (
            <MetricCard
              key={queue.title}
              title={queue.title}
              value={queue.value}
              description={queue.description}
              trend={queue.action}
              tone={queue.tone}
              icon={<span className="text-lg font-black">•</span>}
            />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            title="Was braucht Aufmerksamkeit?"
            description="Kurzer Arbeitsfokus statt technischer Datenflut."
            action={<StatusBadge status="IN_PROGRESS" label="Arbeitsmodus" />}
          >
            <div className="grid gap-4">
              {nextActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        <p className="text-lg font-black text-white">
                          {item.title}
                        </p>
                      </div>

                      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                        {item.description}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-cyan-400/30 px-4 py-2 text-xs font-bold text-cyan-200 transition group-hover:border-cyan-300 group-hover:bg-cyan-400/10">
                      {item.label} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Hauptprozess"
            description="Der operative Weg von Anfrage bis Zahlung."
          >
            <div className="space-y-3">
              {workflow.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-black text-white">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <DashboardPanel
            title="Schnellzugriff"
            description="Nur die wichtigsten Arbeitsbereiche. Technische Bereiche liegen im Menü unter System / Technik."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PremiumButton href="/dashboard/customers" variant="secondary">
                Kunden
              </PremiumButton>
              <PremiumButton href="/dashboard/orders" variant="secondary">
                Aufträge
              </PremiumButton>
              <PremiumButton href="/dashboard/estimates" variant="secondary">
                Kalkulationen
              </PremiumButton>
              <PremiumButton href="/dashboard/quotes" variant="secondary">
                Offerten
              </PremiumButton>
              <PremiumButton href="/dashboard/invoices" variant="secondary">
                Rechnungen
              </PremiumButton>
              <PremiumButton href="/dashboard/payments" variant="secondary">
                Zahlungen
              </PremiumButton>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Automatisierung im Hintergrund"
            description="Diese Bereiche arbeiten mit, sollen aber nicht die tägliche Arbeit überladen."
            action={<StatusBadge status="ACCEPTED" label="Aktiv" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {backgroundAutomation.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-sm font-bold text-white">{item}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    Läuft im Hintergrund und bleibt bei Bedarf im Systembereich
                    nachvollziehbar.
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </section>

        <DashboardPanel
          title="Arbeitsregel"
          description="HEXA OS soll Entscheidungen und nächste Schritte sichtbar machen, nicht jede technische Einzelheit."
        >
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-black text-emerald-100">
              Fokus: weniger suchen, weniger klicken, klarer nächster Schritt.
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/70">
              Kunden, Aufträge, Kalkulationen, Offerten, Rechnungen und Zahlungen
              bleiben vollständig verknüpft. Logs, IDs und technische Nachweise
              bleiben erhalten, werden aber nicht als Hauptarbeit angezeigt.
            </p>
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}