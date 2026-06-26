"use client";

import { motion } from "motion/react";

export default function CTA() {
  return (
    <section
      id="kontakt"
      className="relative overflow-hidden bg-[#020711] px-6 py-28 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,220,255,0.16),transparent_38%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Anfrage
          </p>

          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">
            Zwei Wege zur
            <span className="block text-cyan-300">schnellen Offerte.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            whileHover={{ y: -8, scale: 1.015 }}
            className="relative overflow-hidden rounded-[34px] border border-cyan-300/25 bg-white/[0.05] p-8 shadow-[0_0_60px_rgba(0,220,255,0.16)] backdrop-blur-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,220,255,0.22),transparent_45%)]" />

            <div className="relative z-10">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-300/10 text-2xl font-black text-cyan-300">
                AI
              </div>

              <h3 className="text-3xl font-black">HEXA AI</h3>

              <p className="mt-4 leading-7 text-slate-300">
                Beschreiben Sie kurz, was gereinigt oder erledigt werden soll.
                Der digitale Assistent führt Sie Schritt für Schritt zur Anfrage.
              </p>

              <button className="mt-8 rounded-xl bg-cyan-300 px-7 py-4 font-bold text-[#02101b] shadow-[0_0_35px_rgba(0,220,255,0.45)] transition hover:scale-105">
                AI Assistent starten →
              </button>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -8, scale: 1.015 }}
            className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/[0.04] p-8 shadow-[0_0_60px_rgba(255,255,255,0.06)] backdrop-blur-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_45%)]" />

            <div className="relative z-10">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-black text-white">
                ⚡
              </div>

              <h3 className="text-3xl font-black">Schnelle Offerte</h3>

              <p className="mt-4 leading-7 text-slate-300">
                Wählen Sie Leistung, Objektgrösse und Zusatzwünsche. Sie erhalten
                eine klare Anfragebasis für Ihre Offerte.
              </p>

              <button className="mt-8 rounded-xl border border-cyan-300/50 px-7 py-4 font-bold text-white transition hover:bg-cyan-300 hover:text-[#02101b]">
                Schnellformular öffnen →
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}