import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Sparkles,
  Truck,
} from "lucide-react";

const links = [
  {
    href: "/reinigungsfirma-biel",
    title: "Reinigungsfirma Biel",
    text: "Professionelle Reinigung für Wohnungen, Büros und Liegenschaften.",
    icon: MapPin,
  },
  {
    href: "/reinigungsfirma-pieterlen",
    title: "Reinigungsfirma Pieterlen",
    text: "Zuverlässige Reinigung direkt in Pieterlen und Umgebung.",
    icon: MapPin,
  },
  {
    href: "/unterhaltsreinigung-biel",
    title: "Unterhaltsreinigung Biel",
    text: "Regelmässige Reinigung für gepflegte Räume und Gebäude.",
    icon: Building2,
  },
  {
    href: "/bueroreinigung-biel",
    title: "Büroreinigung Biel",
    text: "Saubere Büros, Geschäftsflächen und Sanitärbereiche.",
    icon: Building2,
  },
  {
    href: "/umzugsreinigung-biel",
    title: "Umzugsreinigung Biel",
    text: "Gründliche Endreinigung für Wohnungs- und Hausübergaben.",
    icon: Truck,
  },
  {
    href: "/fensterreinigung-biel",
    title: "Fensterreinigung Biel",
    text: "Professionelle Reinigung von Fenstern und Glasflächen.",
    icon: Sparkles,
  },
];

export default function LocalSeoLinks() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#020711] px-6 py-20 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.12),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            Reinigung in Ihrer Region
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] md:text-5xl">
            Unsere Reinigungsleistungen
            <span className="block text-cyan-300">
              in Biel und Pieterlen
            </span>
          </h2>

          <p className="mt-5 text-base leading-8 text-slate-300">
            Entdecken Sie unsere lokalen Reinigungsangebote für Privatkunden,
            Unternehmen und Verwaltungen.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[22px] border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/[0.07] hover:shadow-[0_0_35px_rgba(34,211,238,0.12)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowUpRight className="h-5 w-5 text-slate-500 transition group-hover:text-cyan-300" />
                </div>

                <h3 className="mt-5 text-xl font-black">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {item.text}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}