"use client";

import { motion } from "motion/react";

export default function CTA() {
  return (
    <section id="kontakt" className="relative overflow-hidden bg-[#020711] px-6 py-24 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(0,220,255,0.18),transparent_30%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 rounded-[36px] border border-cyan-300/25 bg-white/[0.04] p-8 shadow-[0_0_80px_rgba(0,220,255,0.16)] backdrop-blur-xl md:grid-cols-[1.1fr_0.9fr] md:p-12">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
            Bereit für <span className="text-cyan-300">makellose</span> Sauberkeit?
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Kontaktieren Sie uns noch heute und erhalten Sie Ihre kostenlose Offerte innerhalb von 24 Stunden.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="mailto:info@hexaclean.ch"
              className="rounded-xl bg-cyan-300 px-7 py-4 font-semibold text-[#02101b] shadow-[0_0_35px_rgba(0,220,255,0.45)]"
            >
              Jetzt Offerte anfordern →
            </a>

            <a
              href="https://wa.me/"
              className="rounded-xl border border-cyan-300/50 px-7 py-4 font-semibold hover:bg-white/10"
            >
              WhatsApp Chat starten
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative hidden min-h-[260px] items-center justify-center md:flex"
        >
          <div className="absolute h-44 w-44 rounded-[36px] border border-cyan-200/40 bg-white/[0.05] shadow-[0_0_70px_rgba(0,220,255,0.45)] rotate-45" />
          <div className="relative text-[120px] font-black leading-none text-cyan-100 drop-shadow-[0_0_35px_rgba(0,220,255,0.9)]">
            H
          </div>
          <div className="absolute bottom-8 h-4 w-72 rounded-full bg-cyan-300/30 blur-xl" />
        </motion.div>
      </div>
    </section>
  );
}