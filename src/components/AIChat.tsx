"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function AIChatBox() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-2xl border border-cyan-300/40 bg-[#06111d]/90 px-5 py-4 font-bold text-cyan-200 shadow-[0_0_35px_rgba(0,220,255,0.35)] backdrop-blur-xl transition hover:scale-105"
      >
        HEXA AI
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] overflow-hidden rounded-[28px] border border-cyan-300/30 bg-[#06111d]/95 text-white shadow-[0_0_70px_rgba(0,220,255,0.28)] backdrop-blur-2xl"
          >
            <div className="border-b border-cyan-300/20 bg-white/[0.04] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-cyan-300">HEXA AI</p>
                  <p className="text-xs text-slate-400">
                    Ihr digitaler Reinigungsberater
                  </p>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/10"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl bg-cyan-300/10 p-4 text-sm leading-6 text-slate-200">
                Guten Tag. Wobei kann ich helfen?
                <br />
                Sie können z.B. schreiben:
                <br />
                <span className="text-cyan-300">
                  „Ich brauche eine Reinigung für 120 m².“
                </span>
              </div>

              <div className="grid gap-2 text-sm">
                {[
                  "Wohnungsreinigung",
                  "Umzugsreinigung",
                  "Fensterreinigung",
                  "Gartenpflege",
                  "Kleine Reparaturen",
                ].map((item) => (
                  <button
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-300"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Nachricht schreiben..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
                />

                <button className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-[#02101b]">
                  →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}