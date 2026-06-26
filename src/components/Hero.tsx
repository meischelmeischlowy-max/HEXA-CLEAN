"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Hexagon,
  ScanLine,
  Sparkles,
  Zap,
} from "lucide-react";
import CinematicEffects from "./CinematicEffects";

const titleWords = ["HEXA", "CLEAN"];

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  return (
    <section
      id="startseite"
      className="relative min-h-screen overflow-hidden bg-black text-white"
    >
      {/* STATIC MOBILE BACKGROUND */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: "url('/images/hero.png')" }}
      />

      {/* ANIMATED DESKTOP BACKGROUND */}
      <motion.div
        className="absolute inset-0 z-0 hidden scale-110 bg-cover bg-center md:block"
        style={{ backgroundImage: "url('/images/hero.png')" }}
        animate={{ scale: [1.1, 1.145, 1.1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black via-black/82 to-black/35" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/15 to-black/60" />

      <CinematicEffects />

      {/* INTRO ONLY DESKTOP */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 hidden bg-black md:block"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
      />

      <div className="relative z-30 grid min-h-screen items-center gap-10 px-6 pb-16 pt-40 md:px-14 md:pt-48 lg:grid-cols-[1.05fr_0.95fr] lg:px-24 lg:pt-40">
        <div className="max-w-4xl">
          <motion.div
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-md md:text-sm"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Sparkles size={16} />
            Premium Reinigung · Hauswartung · Kleine Reparaturen
          </motion.div>

          <motion.h1
            className="text-[42px] font-black leading-[0.96] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[96px]"
            initial="hidden"
            animate="visible"
          >
            <span className="block overflow-hidden">
              {titleWords.map((word, index) => (
                <motion.span
                  key={word}
                  className="mr-5 inline-block text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.22)]"
                  variants={{
                    hidden: { y: 70, opacity: 0 },
                    visible: {
                      y: 0,
                      opacity: 1,
                      transition: {
                        duration: 0.75,
                        delay: 0.35 + index * 0.16,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </span>

            <span className="block overflow-hidden pb-2">
              <motion.span
                className="relative block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(34,211,238,0.45)]"
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.75,
                  delay: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                Sauberkeit mit System.
              </motion.span>
            </span>
          </motion.h1>

          <motion.div
            className="mt-5 h-[2px] w-0 bg-gradient-to-r from-cyan-300 via-white to-transparent shadow-[0_0_22px_rgba(34,211,238,1)]"
            animate={{ width: ["0%", "70%", "48%"] }}
            transition={{ duration: 1.1, delay: 0.9, ease: "easeOut" }}
          />

          <motion.p
            className="mt-6 max-w-2xl text-base leading-7 text-white/75 md:text-lg lg:text-xl lg:leading-8"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
          >
            Moderne Reinigung, Hauswartung, Fensterreinigung, Gartenpflege und
            kleine Reparaturen – schnell, sauber und professionell.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.15 }}
          >
            <motion.button
              type="button"
              onClick={() => scrollToSection("quick-offer")}
              className="group relative z-50 inline-flex cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full bg-cyan-300 px-7 py-4 font-bold text-black shadow-[0_0_45px_rgba(34,211,238,0.6)] transition hover:bg-white"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition duration-700 group-hover:translate-x-full" />
              <span className="relative">Schnelle Offerte starten</span>
              <ArrowRight size={18} className="relative" />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => scrollToSection("services")}
              className="relative z-50 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/60 hover:bg-cyan-300/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
            >
              Leistungen ansehen
            </motion.button>
          </motion.div>
        </div>

        {/* DESKTOP AI PANEL ONLY */}
        <motion.div
          className="relative hidden lg:block"
          initial={{ opacity: 0, x: 50, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative overflow-hidden rounded-[38px] border border-cyan-300/25 bg-black/35 p-6 shadow-[0_0_90px_rgba(34,211,238,0.22)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-300">
                  HEXA AI
                </p>
                <h3 className="mt-2 text-3xl font-black">Live Analyse</h3>
              </div>

              <div className="relative flex h-16 w-16 items-center justify-center">
                <motion.div
                  className="absolute inset-0 text-cyan-300"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Hexagon size={64} strokeWidth={1.4} />
                </motion.div>

                <Zap className="text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,1)]" />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/35 p-5">
              <div className="mb-4 flex items-center gap-3 text-cyan-300">
                <ScanLine className="animate-pulse" size={22} />
                <span className="font-bold">Analyse läuft...</span>
              </div>

              <div className="mb-6 h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,1)]"
                  animate={{ width: ["15%", "82%", "45%", "100%"] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <div className="grid gap-3 text-sm">
                {[
                  "Gebäudereinigung erkannt",
                  "Fenster & Glasflächen möglich",
                  "Hauswartung kombinierbar",
                  "Offerte in 60 Sekunden",
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      delay: index * 0.35,
                    }}
                  >
                    <Check size={17} className="text-cyan-300" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-400">
              Moderne Anfrage, schnelle Einschätzung und später direkte
              Verbindung mit E-Mail, Make, Google Sheets und WhatsApp.
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_25px_rgba(34,211,238,0.8)]"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </section>
  );
}