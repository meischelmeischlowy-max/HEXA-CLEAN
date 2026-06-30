import ActivityTimeline from "../../components/dashboard/ActivityTimeline";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import MetricCard from "../../components/dashboard/MetricCard";
import PageHeader from "../../components/dashboard/PageHeader";
import PremiumButton from "../../components/dashboard/PremiumButton";
import StatusBadge from "../../components/dashboard/StatusBadge";

const workflowSteps = [
  {
    title: "Zlecenie",
    description: "Nowa sprawa klienta trafia do CRM.",
    status: "OPEN",
  },
  {
    title: "Oferta",
    description: "System tworzy ofertę z danych zlecenia.",
    status: "SENT",
  },
  {
    title: "Faktura",
    description: "Po akceptacji oferta przechodzi do faktury.",
    status: "DRAFT",
  },
  {
    title: "Płatność",
    description: "Płatność oczekuje lub zostaje oznaczona jako opłacona.",
    status: "PENDING",
  },
  {
    title: "Zakończenie",
    description: "Zlecenie zamknięte po opłaceniu i realizacji.",
    status: "COMPLETED",
  },
];

const activityItems = [
  {
    id: "activity-1",
    title: "Workflow CRM aktywny",
    description:
      "Zlecenie → Oferta → Faktura → Płatność → Zakończenie działa jako główny proces operacyjny.",
    status: "IN_PROGRESS",
    time: "HEXA OS",
  },
  {
    id: "activity-2",
    title: "Quick actions gotowe",
    description:
      "System posiada akcje tworzenia ofert, faktur, płatności oraz oznaczania statusów.",
    status: "ACCEPTED",
    time: "CRM Automation",
  },
  {
    id: "activity-3",
    title: "Redesign panelu rozpoczęty",
    description:
      "Dashboard przechodzi na wygląd premium SaaS z KPI, workflow, timeline i statusami.",
    status: "SENT",
    time: "UI Premium",
  },
];

const modules = [
  "Klienci",
  "Zlecenia",
  "Oferty",
  "Faktury",
  "Płatności",
  "AI Concierge",
  "Automatyzacje",
  "Audit log",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="HEXA OS / Business Operations Panel"
          title="Centrum dowodzenia firmy usługowej"
          description="Profesjonalny panel CRM do obsługi klientów, zleceń, ofert, faktur, płatności, automatyzacji i późniejszego AI Concierge."
        >
          <PremiumButton href="/dashboard/orders" variant="primary">
            Zlecenia
          </PremiumButton>
          <PremiumButton href="/dashboard/customers" variant="secondary">
            Klienci
          </PremiumButton>
        </PageHeader>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="System"
            value="Online"
            description="Panel operacyjny HEXA OS działa i jest gotowy do dalszej rozbudowy."
            trend="Status: stabilny"
            tone="emerald"
            icon={<span className="text-lg font-black">OS</span>}
          />

          <MetricCard
            title="Workflow"
            value="5 etapów"
            description="Zlecenie, oferta, faktura, płatność i zakończenie procesu."
            trend="Automatyzacja CRM"
            tone="cyan"
            icon={<span className="text-lg font-black">↗</span>}
          />

          <MetricCard
            title="Moduły"
            value="8"
            description="Klienci, zlecenia, oferty, faktury, płatności, AI i logi."
            trend="Panel premium SaaS"
            tone="violet"
            icon={<span className="text-lg font-black">◆</span>}
          />

          <MetricCard
            title="Finanse"
            value="CRM"
            description="Faktury i płatności są częścią jednego procesu biznesowego."
            trend="Kontrola płatności"
            tone="amber"
            icon={<span className="text-lg font-black">CHF</span>}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <DashboardPanel
            title="Puls systemu"
            description="Pokazowy wykres operacyjny. W kolejnym etapie podłączymy tu realne dane z bazy."
            action={<StatusBadge status="IN_PROGRESS" label="Live preview" />}
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Operacje
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">CRM</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Automatyzacja
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
                  aria-label="Wykres pulsu systemu HEXA OS"
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
            title="Status operacyjny"
            description="Najważniejsze moduły systemu w jednym miejscu."
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
                      Moduł HEXA OS
                    </p>
                  </div>

                  <StatusBadge status="ACCEPTED" label="Aktywny" />
                </div>
              ))}
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <DashboardPanel
            title="Workflow sprzedaży"
            description="Docelowy proces obsługi klienta od zapytania do zamknięcia zlecenia."
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
            title="Ostatnia aktywność"
            description="Live feed dla akcji CRM, statusów i automatyzacji."
            action={
              <PremiumButton href="/dashboard/audit-logs" variant="ghost">
                Audit log
              </PremiumButton>
            }
          >
            <ActivityTimeline items={activityItems} />
          </DashboardPanel>
        </section>

        <DashboardPanel
          title="HEXA OS — kierunek produktu"
          description="Ten panel ma wyglądać jak gotowy system premium, który można pokazać klientowi i później sprzedawać jako rozwiązanie dla firm usługowych."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm font-black text-cyan-100">
                CRM dla firmy usługowej
              </p>
              <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                Klienci, zlecenia, oferty, faktury i płatności w jednym
                panelu.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
              <p className="text-sm font-black text-violet-100">
                AI Concierge
              </p>
              <p className="mt-2 text-sm leading-6 text-violet-100/70">
                Docelowo chatbot z numerem sesji, zbieraniem danych i
                automatyzacją zapytań.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm font-black text-emerald-100">
                Automatyzacje
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                Powiadomienia, email, workflow, statusy i pełny ślad działań w
                audit log.
              </p>
            </div>
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}