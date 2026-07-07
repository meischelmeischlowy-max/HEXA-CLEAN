import ActivityTimeline from "../../components/dashboard/ActivityTimeline";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import MetricCard from "../../components/dashboard/MetricCard";
import PageHeader from "../../components/dashboard/PageHeader";
import PremiumButton from "../../components/dashboard/PremiumButton";
import StatusBadge from "../../components/dashboard/StatusBadge";

const workflowSteps = [
  {
    title: "Anfrage",
    description: "Eine neue Kundenanfrage kommt über Formular, Telefon oder AI Concierge ins System.",
    status: "OPEN",
  },
  {
    title: "Angebot",
    description: "Aus Kundendaten, Leistungsort und Leistungen wird ein Angebot vorbereitet.",
    status: "SENT",
  },
  {
    title: "Auftrag",
    description: "Nach Annahme des Angebots wird daraus ein konkreter Auftrag.",
    status: "IN_PROGRESS",
  },
  {
    title: "Rechnung",
    description: "Nach Leistung oder Freigabe wird automatisch eine Rechnung erstellt.",
    status: "DRAFT",
  },
  {
    title: "Zahlung",
    description: "Erfasste Zahlungen aktualisieren den Rechnungsstatus automatisch.",
    status: "PENDING",
  },
];

const activityItems = [
  {
    id: "activity-1",
    title: "HEXA OS ist aktiv",
    description:
      "Kunden, Aufträge, Angebote, Rechnungen und Zahlungen sind im operativen System verfügbar.",
    status: "IN_PROGRESS",
    time: "HEXA OS",
  },
  {
    id: "activity-2",
    title: "Rechnungsmodul erweitert",
    description:
      "Rechnungen können aus Angeboten erstellt, geöffnet, gedruckt und mit Zahlungen verbunden werden.",
    status: "ACCEPTED",
    time: "Rechnungen",
  },
  {
    id: "activity-3",
    title: "Automatisierung im Fokus",
    description:
      "Statuswerte sollen aus echten Aktionen entstehen, nicht aus manueller Statuspflege.",
    status: "SENT",
    time: "Workflow",
  },
];

const modules = [
  "Kunden",
  "Aufträge",
  "Kalkulationen",
  "Angebote",
  "Rechnungen",
  "Zahlungen",
  "AI Concierge",
  "Audit Log",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="HEXA OS / Betriebs-Panel"
          title="Operations-Zentrale für Dienstleistungsbetriebe"
          description="CRM, Kundenanfragen, Aufträge, Angebote, Rechnungen, Zahlungen und Automatisierung in einem System."
        >
          <PremiumButton href="/dashboard/orders" variant="primary">
            Aufträge
          </PremiumButton>
          <PremiumButton href="/dashboard/customers" variant="secondary">
            Kunden
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="System"
            value="Online"
            description="Das HEXA OS Operations Panel ist aktiv und bereit für die weitere Automatisierung."
            trend="Status: aktiv"
            tone="emerald"
            icon={<span className="text-lg font-black">OS</span>}
          />

          <MetricCard
            title="Workflow"
            value="5 Schritte"
            description="Anfrage, Angebot, Auftrag, Rechnung und Zahlung als operativer Hauptprozess."
            trend="Automation first"
            tone="cyan"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="Module"
            value="8"
            description="Kunden, Aufträge, Angebote, Rechnungen, Zahlungen, AI und Audit Log."
            trend="SaaS-Struktur"
            tone="violet"
            icon={<span className="text-lg font-black">◆</span>}
          />

          <MetricCard
            title="Finanzen"
            value="CHF"
            description="Rechnungen und Zahlungen sind direkt mit dem Geschäftsprozess verbunden."
            trend="Zahlungskontrolle"
            tone="amber"
            icon={<span className="text-lg font-black">CHF</span>}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <DashboardPanel
            title="Systempuls"
            description="Operative Vorschau. Später werden hier echte Kennzahlen aus der Datenbank angezeigt."
            action={<StatusBadge status="IN_PROGRESS" label="Live-Vorschau" />}
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Betrieb
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">CRM</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Automation
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">Ready</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Panel
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      Premium
                    </p>
                  </div>
                </div>

                <svg
                  viewBox="0 0 900 260"
                  className="h-64 w-full rounded-3xl border border-white/10 bg-zinc-950/80"
                  role="img"
                  aria-label="HEXA OS Systempuls"
                >
                  <defs>
                    <linearGradient id="hexaPulse" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                      <stop offset="45%" stopColor="#22d3ee" stopOpacity="1" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
                    </linearGradient>

                    <linearGradient id="hexaFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 210 L0 170 C70 155 90 130 150 145 C220 165 230 88 300 110 C370 132 400 70 470 95 C540 120 560 180 630 155 C700 130 720 70 790 92 C845 110 870 95 900 80 L900 260 L0 260 Z"
                    fill="url(#hexaFill)"
                  />

                  <path
                    d="M0 170 C70 155 90 130 150 145 C220 165 230 88 300 110 C370 132 400 70 470 95 C540 120 560 180 630 155 C700 130 720 70 790 92 C845 110 870 95 900 80"
                    fill="none"
                    stroke="url(#hexaPulse)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />

                  {[120, 260, 420, 580, 740].map((x) => (
                    <line
                      key={x}
                      x1={x}
                      x2={x}
                      y1="30"
                      y2="230"
                      stroke="white"
                      strokeOpacity="0.05"
                    />
                  ))}

                  {[70, 130, 190].map((y) => (
                    <line
                      key={y}
                      x1="40"
                      x2="860"
                      y1={y}
                      y2={y}
                      stroke="white"
                      strokeOpacity="0.05"
                    />
                  ))}
                </svg>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Operativer Status"
            description="Die wichtigsten Systemmodule auf einen Blick."
          >
            <div className="grid gap-3">
              {modules.map((module) => (
                <div
                  key={module}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="font-bold text-white">{module}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      HEXA OS Modul
                    </p>
                  </div>

                  <StatusBadge status="ACCEPTED" label="Aktiv" />
                </div>
              ))}
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <DashboardPanel
            title="Automatisierter Geschäftsprozess"
            description="Zielprozess von der Kundenanfrage bis zur Zahlung."
          >
            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-sm font-black text-cyan-100">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-black tracking-tight text-white">
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={step.status} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Letzte Aktivität"
            description="Live Feed für CRM-Aktionen, Dokumente und Automatisierungen."
            action={
              <PremiumButton href="/dashboard/audit-logs" variant="ghost">
                Audit Log
              </PremiumButton>
            }
          >
            <ActivityTimeline items={activityItems} />
          </DashboardPanel>
        </section>

        <DashboardPanel
          title="HEXA OS — Produktbasis"
          description="Dieses System ist die erste vollständige Basis für spätere wiederverwendbare MM Core Module."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm font-black text-cyan-100">
                CRM für Dienstleister
              </p>
              <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                Kunden, Aufträge, Angebote, Rechnungen und Zahlungen in einem
                Panel.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
              <p className="text-sm font-black text-violet-100">
                AI Concierge
              </p>
              <p className="mt-2 text-sm leading-6 text-violet-100/70">
                Später mit Sitzungsnummer, Kundendaten, Anfrageaufnahme und
                automatischer Übergabe an das CRM.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm font-black text-emerald-100">
                Automatisierung
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                E-Mail, Dokumente, Zahlungen, Erinnerungen und Audit Log sollen
                aus echten Aktionen entstehen.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}