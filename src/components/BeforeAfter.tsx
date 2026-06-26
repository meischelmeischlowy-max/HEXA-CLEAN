"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, Sparkles, ShieldCheck } from "lucide-react";

export default function BeforeAfter() {
  const [position, setPosition] = useState(55);

  return (
    <section
      id="before-after"
      className="scroll-mt-28 relative overflow-hidden bg-[#020711] px-6 py-32 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_25%,rgba(34,211,238,0.17),transparent_38%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(34,211,238,0.1),transparent_32%)]" />

      <motion.div
        className="absolute left-0 top-28 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.4fr]">
          <motion.div
            initial={{ opacity: 0, x: -35, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="mb-4 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
              <Sparkles size={18} />
              Vorher / Nachher
            </p>

            <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">
              Der Unterschied
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
                muss sichtbar sein.
              </span>
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Ein starker erster Eindruck entsteht durch sichtbare Sauberkeit:
              Böden, Glasflächen, Eingänge und Übergaben müssen klar,
              gepflegt und professionell wirken.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl border border-cyan-300/20 bg-white/[0.05] p-5 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-3 font-bold text-cyan-200">
                  <ShieldCheck size={20} />
                  Transparenter Vergleich
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  Der Slider zeigt den Unterschied visuell — ohne gefälschte
                  Bewertungen oder erfundene Referenzen.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="mb-2 flex items-center gap-3 font-bold text-white">
                  <ArrowLeftRight size={20} className="text-cyan-300" />
                  Ziehen und vergleichen
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  Bewegen Sie den Regler und sehen Sie den Effekt zwischen
                  Vorher und Nachher.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, x: 35, filter: "blur(14px)" }}
            whileInView={{
              opacity: 1,
              scale: 1,
              x: 0,
              filter: "blur(0px)",
            }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="relative overflow-hidden rounded-[38px] border border-cyan-300/30 bg-white/[0.05] p-3 shadow-[0_0_100px_rgba(0,220,255,0.22)] backdrop-blur-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

            <div className="relative h-[340px] overflow-hidden rounded-[30px] md:h-[560px]">
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
                  className="h-full w-[calc(100vw-3rem)] max-w-none object-cover md:w-[760px] lg:w-[780px]"
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

              <div className="absolute inset-0 bg-gradient-to-t from-[#020711]/55 via-transparent to-white/5" />

              <div
                className="absolute top-0 h-full w-[3px] -translate-x-1/2 bg-cyan-300 shadow-[0_0_45px_rgba(0,220,255,1)]"
                style={{ left: `${position}%` }}
              />

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 25px rgba(0,220,255,0.45)",
                    "0 0 60px rgba(0,220,255,1)",
                    "0 0 25px rgba(0,220,255,0.45)",
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="absolute top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/50 bg-[#06111d]/90 text-lg font-black text-white backdrop-blur-xl"
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

              <div className="absolute left-5 top-5 rounded-xl border border-white/15 bg-black/65 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-xl">
                Vorher
              </div>

              <div className="absolute right-5 top-5 rounded-xl border border-cyan-100/40 bg-cyan-300 px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#02101b] shadow-[0_0_25px_rgba(34,211,238,0.55)]">
                Nachher
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}