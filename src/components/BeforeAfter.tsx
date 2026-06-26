"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, Sparkles, ShieldCheck } from "lucide-react";

export default function BeforeAfter() {
  const [position, setPosition] = useState(55);

  return (
    <section
      id="before-after"
      className="scroll-mt-24 relative overflow-hidden bg-[#020711] px-6 py-20 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_25%,rgba(34,211,238,0.15),transparent_36%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(34,211,238,0.08),transparent_30%)]" />

      <motion.div
        className="absolute left-0 top-20 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent"
        animate={{ opacity: [0.15, 0.8, 0.15] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid items-center gap-7 lg:grid-cols-[0.9fr_1.35fr]">
          <motion.div
            initial={{ opacity: 0, x: -24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
              <Sparkles size={15} />
              Vorher / Nachher
            </p>

            <h2 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">
              Der Unterschied
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
                muss sichtbar sein.
              </span>
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-300">
              Ein starker erster Eindruck entsteht durch sichtbare Sauberkeit:
              Böden, Glasflächen, Eingänge und Übergaben müssen klar,
              gepflegt und professionell wirken.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-xl border border-cyan-300/20 bg-white/[0.05] p-4 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-200">
                  <ShieldCheck size={17} />
                  Transparenter Vergleich
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Der Slider zeigt den Unterschied visuell — ohne gefälschte
                  Bewertungen oder erfundene Referenzen.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                  <ArrowLeftRight size={17} className="text-cyan-300" />
                  Ziehen und vergleichen
                </div>
                <p className="text-xs leading-5 text-slate-400">
                  Bewegen Sie den Regler und sehen Sie den Effekt zwischen
                  Vorher und Nachher.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, x: 24, filter: "blur(10px)" }}
            whileInView={{
              opacity: 1,
              scale: 1,
              x: 0,
              filter: "blur(0px)",
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="relative overflow-hidden rounded-[28px] border border-cyan-300/30 bg-white/[0.05] p-2.5 shadow-[0_0_70px_rgba(0,220,255,0.18)] backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

            <div className="relative h-[300px] overflow-hidden rounded-[22px] md:h-[460px]">
              <img
                src="/before-after/floor-before.jpg"
                alt="Vorher"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${position}%` }}
              >
                <img
                  src="/before-after/floor-after.jpg"
                  alt="Nachher"
                  className="h-full w-[calc(100vw-3rem)] max-w-none object-cover md:w-[680px] lg:w-[700px]"
                />

                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                  animate={{ x: ["-80%", "80%", "-80%"] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-[#020711]/50 via-transparent to-white/5" />

              <div
                className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-cyan-300 shadow-[0_0_35px_rgba(0,220,255,0.9)]"
                style={{ left: `${position}%` }}
              />

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 18px rgba(0,220,255,0.45)",
                    "0 0 42px rgba(0,220,255,0.9)",
                    "0 0 18px rgba(0,220,255,0.45)",
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/50 bg-[#06111d]/90 text-sm font-black text-white backdrop-blur-xl"
                style={{ left: `${position}%` }}
              >
                ‹ ›
              </motion.div>

              <input
                type="range"
                min="0"
                max="100"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
              />

              <div className="absolute left-4 top-4 rounded-lg border border-white/15 bg-black/65 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-xl">
                Vorher
              </div>

              <div className="absolute right-4 top-4 rounded-lg border border-cyan-100/40 bg-cyan-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#02101b] shadow-[0_0_20px_rgba(34,211,238,0.45)]">
                Nachher
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}