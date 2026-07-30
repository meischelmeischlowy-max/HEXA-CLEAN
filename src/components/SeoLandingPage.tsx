import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Footer from "@/components/Footer";
import QuickOffer from "@/components/QuickOffer";

type ContentSection = {
  title: string;
  text: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  serviceName: string;
  locationName: string;
  benefits: string[];
  sections: ContentSection[];
  faq: FaqItem[];
};

const phoneDisplay = "+41 77 952 95 82";
const phoneHref = "tel:+41779529582";
const whatsappHref = "https://wa.me/41779529582";

export default function SeoLandingPage({
  eyebrow,
  title,
  intro,
  serviceName,
  locationName,
  benefits,
  sections,
  faq,
}: SeoLandingPageProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    provider: {
      "@type": "LocalBusiness",
      name: "HEXA CLEAN",
      url: "https://hexaclean.ch",
      telephone: phoneDisplay,
      email: "info@hexaclean.ch",
      areaServed: [
        "Pieterlen",
        "Biel/Bienne",
        "Nidau",
        "Brügg",
        "Lyss",
        "Grenchen",
      ],
    },
    areaServed: locationName,
    serviceType: serviceName,
  };

  return (
    <main className="min-h-screen bg-[#020711] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      <header className="absolute inset-x-0 top-0 z-50 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-cyan-300/20 bg-[#020711]/85 px-4 py-3 shadow-[0_0_35px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <Link
            href="/"
            className="text-lg font-black tracking-[0.15em]"
          >
            HEXA
            <span className="text-cyan-300">
              CLEAN
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={phoneHref}
              className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-300 sm:inline-flex"
            >
              <Phone className="mr-2 h-4 w-4" />
              Telefon
            </a>

            <Link
              href="#quick-offer"
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#02101b] transition hover:bg-white"
            >
              Offerte
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-20 pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.2),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_65%,rgba(34,211,238,0.1),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
              {eyebrow}
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.055em] md:text-6xl">
              {title}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              {intro}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#quick-offer"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-300 px-6 py-4 font-black text-[#02101b] transition hover:bg-white"
              >
                Unverbindliche Offerte
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-4 font-bold text-white transition hover:border-cyan-300/50 hover:text-cyan-300"
              >
                WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-300/20 bg-white/[0.05] p-6 shadow-[0_0_55px_rgba(34,211,238,0.12)]">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              Ihre Vorteile
            </p>

            <div className="mt-5 space-y-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-cyan-300" />
                Pieterlen, Biel/Bienne und Umgebung
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-cyan-300" />
                Montag bis Freitag, 09:00–18:00
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-cyan-300" />
                {phoneDisplay}
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-300" />
                info@hexaclean.ch
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#06111d] p-6">
              <Sparkles className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-5 text-xl font-black">
                Gründliche Ausführung
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Saubere Arbeitsabläufe und sorgfältige Kontrolle der vereinbarten Leistungen.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#06111d] p-6">
              <ShieldCheck className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-5 text-xl font-black">
                Zuverlässiger Service
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Klare Absprachen, direkte Kommunikation und nachvollziehbare Offerten.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#06111d] p-6">
              <MapPin className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-5 text-xl font-black">
                Regional erreichbar
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Einsätze in Pieterlen, Biel/Bienne und weiteren Orten der Region.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            HEXA CLEAN
          </p>

          <div className="mt-8 grid gap-5">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 md:p-8"
              >
                <h2 className="text-2xl font-black tracking-[-0.035em] md:text-3xl">
                  {section.title}
                </h2>

                <p className="mt-4 text-base leading-8 text-slate-300">
                  {section.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#06111d] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
            Häufige Fragen
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] md:text-5xl">
            Fragen zu {serviceName}
          </h2>

          <div className="mt-10 grid gap-4">
            {faq.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-white/10 bg-black/20 p-6"
              >
                <h3 className="text-lg font-black">
                  {item.question}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <QuickOffer />

      <section className="px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 rounded-[26px] border border-cyan-300/20 bg-cyan-300/10 p-7 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-black">
              Weitere Leistungen entdecken
            </h2>

            <p className="mt-2 text-sm text-slate-300">
              Reinigung, Hauswartung, Gartenpflege und kleine Reparaturen.
            </p>
          </div>

          <Link
            href="/#services"
            className="inline-flex shrink-0 items-center rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#02101b]"
          >
            Alle Leistungen
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}