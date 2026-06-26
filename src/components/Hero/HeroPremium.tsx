"use client";

import { motion } from "motion/react";
import {
  ShieldCheck,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import PrimaryButton from "../../ui/PrimaryButton";
import SecondaryButton from "../../ui/SecondaryButton";

const highlights = [
  { icon: ShieldCheck, label: "Versichert" },
  { icon: Clock, label: "Pünktlich" },
  { icon: Sparkles, label: "Qualität" },
  { icon: Zap, label: "Express-Service" },
];

export default function HeroPremium() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black px-6 pt-32 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_80%_35%,rgba(59,130,246,0.22),transparent_32%),linear-gradient(180deg,#020617_0%,#000_100%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:90px_90px] opacity-20" />

      <motion.div
        className="absolute left-[45%] top-[-250px] h-[1000px] w-[260px] rotate-12 bg-cyan-300/15 blur-3xl"
        animate={{ x: [-180, 180, -180], opacity: [0.18, 0.45, 0.18] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto grid min-h-[82vh] max-w-7xl items-center gap-16 lg:grid-cols-[1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.45em] text-cyan-300">
            Professionelle Reinigung
          </p>

          <h1 className="text-6xl font-black leading-[0.9] tracking-tight md:text-8xl xl:text-9xl">
            HEXA
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-transparent">
              CLEAN
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-3xl font-bold text-white md:text-5xl">
            Sauber. Pünktlich. Professionell.
          </p>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Reinigung, Hauswartung, Gartenpflege und Kleinreparaturen —
            zuverlässig, versichert und ohne versteckte Kosten.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <PrimaryButton>Kostenlose Offerte</PrimaryButton>
            <SecondaryButton>WhatsApp kontaktieren</SecondaryButton>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl"
                >
                  <Icon className="text-cyan-300" size={20} />
                  <span className="text-sm font-semibold text-zinc-300">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="relative mx-auto flex h-[520px] w-full max-w-[560px] items-center justify-center"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute inset-0 rounded-[3rem] border border-cyan-300/20 bg-white/[0.04] backdrop-blur-2xl shadow-[0_0_120px_rgba(34,211,238,0.22)]" />

          <motion.div
            className="absolute h-[380px] w-[380px] border border-cyan-300/30 bg-cyan-300/5 shadow-[0_0_100px_rgba(34,211,238,0.28)]"
            style={{
              clipPath:
                "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="absolute h-[250px] w-[250px] border border-white/20 bg-white/[0.04]"
            style={{
              clipPath:
                "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
            }}
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />

          <motion.div
            className="absolute h-[140px] w-[140px] rounded-full bg-cyan-300/20 blur-3xl"
            animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <div className="relative text-center">
            <p className="text-sm uppercase tracking-[0.5em] text-cyan-200">
              HEXA
            </p>
            <p className="mt-3 text-6xl font-black">CLEAN</p>
            <p className="mt-4 text-sm text-zinc-400">
              Premium Service Experience
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}