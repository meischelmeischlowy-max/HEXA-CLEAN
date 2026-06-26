"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Sparkles,
  Truck,
  Home,
  Leaf,
  Wrench,
  ArrowUpRight,
  X,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    number: "01",
    title: "Gebäudereinigung",
    text: "Professionelle Reinigung für Büros, Lobbys, Treppenhäuser und Geschäftsflächen.",
    details:
      "Wir reinigen Büroflächen, Eingangsbereiche, Treppenhäuser, Lobbys, Sanitärbereiche und allgemeine Geschäftsflächen. Der Fokus liegt auf sichtbarer Sauberkeit, gepflegtem Eindruck und zuverlässiger Ausführung.",
    points: [
      "Bodenreinigung und Pflege",
      "Treppenhausreinigung",
      "Sanitär- und Oberflächenreinigung",
      "Regelmäßige oder einmalige Einsätze",
    ],
    image: "/images/service-gebaeude.png",
    size: "md:col-span-2 md:row-span-2",
    icon: Building2,
  },
  {
    number: "02",
    title: "Fensterreinigung",
    text: "Streifenfreie Fenster und Glasflächen mit professioneller Technik.",
    details:
      "Wir reinigen Fenster, Glasflächen, Rahmen und zugängliche Glasbereiche gründlich und streifenfrei. Ideal für Wohnungen, Häuser, Büros und Geschäftsflächen.",
    points: [
      "Fenster innen und außen",
      "Glasflächen und Rahmen",
      "Streifenfreie Reinigung",
      "Auch für Umzugs- oder Endreinigung",
    ],
    image: "/images/service-fenster.png",
    size: "md:col-span-2",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Umzugsreinigung",
    text: "Gründliche Endreinigung für Wohnungen, Häuser und Übergaben.",
    details:
      "Wir übernehmen die gründliche Reinigung vor Wohnungsabgabe oder nach Umzug. Dazu gehören Küche, Bad, Böden, Fenster, Oberflächen und je nach Bedarf Zusatzleistungen.",
    points: [
      "Endreinigung vor Übergabe",
      "Küche, Bad und Wohnräume",
      "Fenster und Oberflächen",
      "Zusatzleistungen nach Absprache",
    ],
    image: "/images/service-umzug.png",
    size: "",
    icon: Truck,
  },
  {
    number: "04",
    title: "Hauswartung",
    text: "Betreuung, Kontrolle und Pflege Ihrer Liegenschaft.",
    details:
      "Wir unterstützen bei der laufenden Betreuung von Liegenschaften: Kontrolle, Reinigung, kleine Arbeiten, Umgebungspflege und zuverlässige Präsenz vor Ort.",
    points: [
      "Regelmäßige Objektkontrolle",
      "Reinigung gemeinsamer Bereiche",
      "Kleine Arbeiten vor Ort",
      "Persönliche Betreuung",
    ],
    image: "/images/service-hauswartung.png",
    size: "",
    icon: Home,
  },
  {
    number: "05",
    title: "Gartenpflege",
    text: "Rasen, Hecken, Umgebungspflege und saubere Aussenbereiche.",
    details:
      "Wir pflegen Außenbereiche, Rasenflächen, Hecken und Wege. Ziel ist ein sauberer, gepflegter Gesamteindruck rund um Haus, Eingang und Umgebung.",
    points: [
      "Rasenpflege",
      "Hecken- und Strauchpflege",
      "Laub und Umgebung reinigen",
      "Saubere Außenbereiche",
    ],
    image: "/images/service-garten.png",
    size: "md:col-span-2",
    icon: Leaf,
  },
  {
    number: "06",
    title: "Kleine Reparaturen",
    text: "Montage, Kleinreparaturen und technische Hilfe im Alltag.",
    details:
      "Wir helfen bei kleinen Reparaturen, Montagen und praktischen Arbeiten im Alltag. Geeignet für einfache Arbeiten, bei denen schnell und zuverlässig Unterstützung gebraucht wird.",
    points: [
      "Kleine Reparaturen",
      "Montagearbeiten",
      "Praktische Hilfe im Alltag",
      "Saubere und zuverlässige Ausführung",
    ],
    image: "/images/service-reparaturen.png",
    size: "md:col-span-2",
    icon: Wrench,
  },
];

type Service = (typeof services)[number];

export default function Services() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  return (
    <section
      id="services"
      className="scroll-mt-24 relative overflow-hidden bg-[#020711] px-6 py-20 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(34,211,238,0.15),transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.08),transparent_28%)]" />

      <motion.div
        className="absolute left-0 top-20 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
        animate={{ opacity: [0.12, 0.75, 0.12] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="mb-10 max-w-2xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Unsere Leistungen
          </p>

          <h2 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Leistungen,
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              die Eindruck machen.
            </span>
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-300">
            Reinigung, Hauswartung, Gartenpflege und kleine Reparaturen mit
            professionellem Anspruch.
          </p>
        </motion.div>

        <div className="grid auto-rows-[220px] gap-4 md:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.article
                key={service.title}
                onClick={() => setSelectedService(service)}
                initial={{
                  opacity: 0,
                  y: 32,
                  scale: 0.97,
                  filter: "blur(10px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.65,
                  delay: index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6, scale: 1.012 }}
                className={`group relative cursor-pointer overflow-hidden rounded-[24px] border border-cyan-300/20 bg-white/[0.04] shadow-[0_0_40px_rgba(0,220,255,0.1)] ${service.size}`}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#020711]/98 via-[#020711]/60 to-black/10" />

                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <div className="rounded-full border border-cyan-300/30 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200 backdrop-blur-xl">
                    {service.number}
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 backdrop-blur-xl">
                    <Icon size={15} />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-black tracking-[-0.04em]">
                    {service.title}
                  </h3>

                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-300">
                    {service.text}
                  </p>

                  <div className="mt-3 flex translate-y-3 items-center gap-1.5 text-xs font-bold text-cyan-200 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    Mehr erfahren
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedService && (
          <ServiceModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ServiceModal({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const Icon = service.icon;

  return (
    <motion.div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 25 }}
        transition={{ duration: 0.25 }}
        onClick={(event) => event.stopPropagation()}
        className="relative grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-cyan-300/25 bg-[#06111d] shadow-[0_0_80px_rgba(0,220,255,0.25)] md:grid-cols-[1.15fr_0.85fr]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-cyan-300 hover:text-black"
        >
          <X size={20} />
        </button>

        <div className="relative h-[280px] md:h-auto">
          <img
            src={service.image}
            alt={service.title}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#06111d] via-black/25 to-transparent" />

          <div className="absolute bottom-5 left-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 backdrop-blur-xl">
              <Icon size={20} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">
                Leistung {service.number}
              </p>
              <h3 className="text-2xl font-black">{service.title}</h3>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            HEXA CLEAN
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
            {service.title}
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            {service.details}
          </p>

          <div className="mt-6 space-y-3">
            {service.points.map((point) => (
              <div
                key={point}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-300" />
                {point}
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#quick-offer"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#02101b] transition hover:bg-white"
            >
              Schnellofferte öffnen
            </a>

            <a
              href="https://wa.me/41762581948"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:text-cyan-300"
            >
              WhatsApp Kontakt
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}