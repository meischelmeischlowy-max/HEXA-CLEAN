"use client";

import { motion } from "motion/react";

const testimonials = [
  {
    name: "Privatkunde",
    location: "Aargau",
    text: "Sehr saubere Arbeit, zuverlässig und freundlich. Die Wohnung sah nach der Reinigung deutlich besser aus als erwartet.",
    service: "Wohnungsreinigung",
  },
  {
    name: "Geschäftskunde",
    location: "Baden",
    text: "Professioneller Auftritt, klare Kommunikation und sichtbare Resultate. Genau so stellt man sich einen modernen Reinigungsservice vor.",
    service: "Büroreinigung",
  },
  {
    name: "Liegenschaft",
    location: "Zürich Umgebung",
    text: "Hauswartung, Reinigung und kleine Arbeiten wurden sauber koordiniert. Schnell, ordentlich und zuverlässig.",
    service: "Hauswartung",
  },
];

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-[#020711] px-6 py-28 text-white"
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,210,255,0.12),transparent_30%),radial-gradient(circle_at_80%_65%,rgba(0,90,255,0.16),transparent_34%),linear-gradient(180deg,#020711_0%,#04101f_48%,#020711_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[150px]" />

      {/* subtle grid */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
        transition={{
          duration: 26,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
        }}
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
            Kundenstimmen
          </p>

          <h2 className="text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
            Vertrauen entsteht
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-transparent">
              durch Ergebnisse.
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            HEXA CLEAN verbindet zuverlässige Arbeit mit modernem Service,
            klarer Kommunikation und einem hochwertigen Gesamteindruck.
          </p>
        </motion.div>

        {/* TESTIMONIAL CARDS */}
        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 35, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.75,
                delay: index * 0.12,
                ease: "easeOut",
              }}
              className="group relative overflow-hidden rounded-[34px] border border-white/12 bg-white/[0.045] p-7 shadow-[0_0_70px_rgba(0,200,255,0.08)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2 hover:border-cyan-200/35 hover:bg-white/[0.07] hover:shadow-[0_0_90px_rgba(0,200,255,0.18)]"
            >
              {/* glow hover */}
              <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-cyan-300/0 blur-[70px] transition duration-700 group-hover:bg-cyan-300/18" />

              <div className="relative z-10">
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-200/10 text-2xl font-bold text-cyan-100 shadow-[0_0_35px_rgba(103,232,249,0.16)]">
                    “
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                    {item.service}
                  </div>
                </div>

                <p className="min-h-[150px] text-lg leading-8 text-slate-200">
                  {item.text}
                </p>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <p className="text-base font-semibold text-white">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* BOTTOM PREMIUM STRIP */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, delay: 0.2 }}
          className="mt-14 overflow-hidden rounded-[34px] border border-white/12 bg-white/[0.045] p-1 backdrop-blur-2xl"
        >
          <div className="grid gap-px overflow-hidden rounded-[30px] bg-white/10 md:grid-cols-3">
            {[
              { value: "Sauber", label: "sichtbare Resultate" },
              { value: "Zuverlässig", label: "klare Termine" },
              { value: "Modern", label: "premium Auftritt" },
            ].map((item) => (
              <div
                key={item.value}
                className="bg-[#04101f]/90 px-8 py-8 text-center"
              >
                <p className="bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-3xl font-semibold text-transparent">
                  {item.value}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.25em] text-slate-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}