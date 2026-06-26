"use client";

import { motion } from "motion/react";

const stats = [
  {
    value: "24h",
    label: "Express Anfrage",
    text: "Schnelle Rückmeldung für dringende Reinigungs- und Serviceanfragen.",
  },
  {
    value: "100%",
    label: "Sichtbares Ergebnis",
    text: "Fokus auf saubere Flächen, klare Details und hochwertige Ausführung.",
  },
  {
    value: "Premium",
    label: "Auftritt",
    text: "Moderner Service für Privatkunden, Büros und Liegenschaften.",
  },
  {
    value: "Flexibel",
    label: "Einsatzbereiche",
    text: "Reinigung, Hauswartung, Gartenpflege und kleine Reparaturen.",
  },
];

export default function Stats() {
  return (
    <section
      id="stats"
      className="relative overflow-hidden bg-[#020711] px-6 py-28 text-white"
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(0,210,255,0.14),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(0,90,255,0.14),transparent_34%),linear-gradient(180deg,#020711_0%,#04101f_50%,#020711_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[150px]" />

      {/* animated glass line */}
      <motion.div
        className="absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent"
        animate={{ opacity: [0.15, 0.6, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Premium Standard
          </p>

          <h2 className="text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
            Klare Werte.
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-transparent">
              Saubere Wirkung.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            HEXA CLEAN steht für sichtbare Resultate, moderne Präsentation und
            flexible Dienstleistungen rund um Reinigung, Hauswartung und Service.
          </p>
        </motion.div>

        {/* STATS GRID */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.75,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              className="group relative overflow-hidden rounded-[34px] border border-white/12 bg-white/[0.045] p-7 shadow-[0_0_70px_rgba(0,200,255,0.08)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-cyan-200/35 hover:bg-white/[0.07] hover:shadow-[0_0_90px_rgba(0,200,255,0.18)]"
            >
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/0 blur-[80px] transition duration-700 group-hover:bg-cyan-300/18" />

              <div className="relative z-10">
                <p className="bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-4xl font-semibold tracking-[-0.04em] text-transparent">
                  {item.value}
                </p>

                <p className="mt-4 text-lg font-semibold text-white">
                  {item.label}
                </p>

                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {item.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PREMIUM STRIP */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, delay: 0.2 }}
          className="mt-14 rounded-[34px] border border-cyan-200/15 bg-white/[0.045] p-8 text-center shadow-[0_0_80px_rgba(0,200,255,0.1)] backdrop-blur-2xl"
        >
          <p className="mx-auto max-w-4xl text-xl leading-9 text-slate-200 md:text-2xl">
            Ein moderner Reinigungsservice muss nicht nur sauber arbeiten —
            er muss Vertrauen, Qualität und Professionalität ausstrahlen.
          </p>
        </motion.div>
      </div>
    </section>
  );
}