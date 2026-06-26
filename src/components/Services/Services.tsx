"use client";

import { motion } from "motion/react";
import {
  Building2,
  Sparkles,
  Truck,
  Home,
  Leaf,
  Wrench,
  ArrowUpRight,
} from "lucide-react";

const services = [
  {
    number: "01",
    title: "Gebäudereinigung",
    text: "Professionelle Reinigung für Büros, Lobbys, Treppenhäuser und Geschäftsflächen.",
    image: "/images/service-gebaeude.png",
    size: "md:col-span-2 md:row-span-2",
    icon: Building2,
  },
  {
    number: "02",
    title: "Fensterreinigung",
    text: "Streifenfreie Fenster und Glasflächen mit professioneller Technik.",
    image: "/images/service-fenster.png",
    size: "md:col-span-2",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Umzugsreinigung",
    text: "Gründliche Endreinigung für Wohnungen, Häuser und Übergaben.",
    image: "/images/service-umzug.png",
    size: "",
    icon: Truck,
  },
  {
    number: "04",
    title: "Hauswartung",
    text: "Betreuung, Kontrolle und Pflege Ihrer Liegenschaft.",
    image: "/images/service-hauswartung.png",
    size: "",
    icon: Home,
  },
  {
    number: "05",
    title: "Gartenpflege",
    text: "Rasen, Hecken, Umgebungspflege und saubere Aussenbereiche.",
    image: "/images/service-garten.png",
    size: "md:col-span-2",
    icon: Leaf,
  },
  {
    number: "06",
    title: "Kleine Reparaturen",
    text: "Montage, Kleinreparaturen und technische Hilfe im Alltag.",
    image: "/images/service-reparaturen.png",
    size: "md:col-span-2",
    icon: Wrench,
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="scroll-mt-28 relative overflow-hidden bg-[#020711] px-6 py-32 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(34,211,238,0.18),transparent_34%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.1),transparent_30%)]" />

      <motion.div
        className="absolute left-0 top-24 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
        animate={{ opacity: [0.15, 0.9, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 35, filter: "blur(14px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-3xl"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.45em] text-cyan-300">
            Unsere Leistungen
          </p>

          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">
            Leistungen,
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              die Eindruck machen.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Reinigung, Hauswartung, Gartenpflege und kleine Reparaturen mit
            professionellem Anspruch.
          </p>
        </motion.div>

        <div className="grid auto-rows-[290px] gap-6 md:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.article
                key={service.title}
                initial={{
                  opacity: 0,
                  y: 45,
                  scale: 0.96,
                  filter: "blur(12px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.75,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -10, scale: 1.018 }}
                className={`group relative overflow-hidden rounded-[34px] border border-cyan-300/20 bg-white/[0.04] shadow-[0_0_55px_rgba(0,220,255,0.12)] ${service.size}`}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#020711]/98 via-[#020711]/60 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/0 via-cyan-300/0 to-cyan-300/10 opacity-0 transition duration-700 group-hover:opacity-100" />

                <motion.div
                  className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 blur-xl group-hover:opacity-100"
                  whileHover={{ x: "260%" }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                />

                <div className="absolute left-6 top-6 flex items-center gap-3">
                  <div className="rounded-full border border-cyan-300/30 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.25)] backdrop-blur-xl">
                    {service.number}
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 backdrop-blur-xl">
                    <Icon size={18} />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    {service.title}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                    {service.text}
                  </p>

                  <div className="mt-5 flex translate-y-4 items-center gap-2 text-sm font-bold text-cyan-200 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    Mehr erfahren
                    <ArrowUpRight size={16} />
                  </div>
                </div>

                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/90 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-0 transition group-hover:opacity-100" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}