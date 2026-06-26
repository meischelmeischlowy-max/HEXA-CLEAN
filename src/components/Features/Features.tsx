"use client";

import { motion } from "motion/react";
import {
  BadgeCheck,
  Clock,
  Globe2,
  HeartHandshake,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import GlassCard from "../../ui/GlassCard";

const features = [
  {
    icon: ShieldCheck,
    title: "Versichert",
    text: "Voll versichert für Ihre Sicherheit.",
  },
  {
    icon: Clock,
    title: "Pünktlich",
    text: "Zuverlässig, termingerecht und sauber geplant.",
  },
  {
    icon: HeartHandshake,
    title: "Familienbetrieb",
    text: "Persönlicher Service mit Verantwortung.",
  },
  {
    icon: BadgeCheck,
    title: "Faire Preise",
    text: "Transparente Angebote ohne versteckte Kosten.",
  },
  {
    icon: Smartphone,
    title: "WhatsApp 24/7",
    text: "Schnelle Kontaktaufnahme und flexible Termine.",
  },
  {
    icon: Globe2,
    title: "4 Sprachen",
    text: "Deutsch • Italiano • English • Polski",
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Why choose us
          </p>

          <h2 className="mt-5 text-4xl font-black text-white md:text-6xl">
            Warum HEXA CLEAN?
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Qualität, Zuverlässigkeit und persönlicher Service – für Kunden,
            die saubere Ergebnisse ohne Stress erwarten.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <GlassCard className="group relative h-full overflow-hidden p-8">
                  <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                  </div>

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,0.18)] transition duration-300 group-hover:scale-110 group-hover:border-cyan-200/70">
                    <Icon size={30} strokeWidth={1.8} />
                  </div>

                  <h3 className="relative mt-8 text-2xl font-bold text-white">
                    {feature.title}
                  </h3>

                  <p className="relative mt-4 leading-relaxed text-zinc-400">
                    {feature.text}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}