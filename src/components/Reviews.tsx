"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const reviews = [
  {
    name: "Maria S.",
    type: "Privatkundin",
    text: "HEXA CLEAN hat unsere Erwartungen übertroffen. Pünktlich, gründlich und sehr freundlich.",
  },
  {
    name: "Thomas K.",
    type: "Geschäftskunde",
    text: "Unsere Büroflächen waren noch nie so sauber. Zuverlässig, professionell und hochwertig.",
  },
  {
    name: "Luca B.",
    type: "Geschäftskunde",
    text: "Die Baureinigung war perfekt. Schnell, sauber und mit einem sehr professionellen Eindruck.",
  },
];

export default function Reviews() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % reviews.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const review = reviews[active];

  return (
    <section
      id="bewertungen"
      className="relative overflow-hidden bg-[#020711] px-6 py-24 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(0,220,255,0.13),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300"
        >
          Kundenmeinungen
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl"
        >
          Vertrauen, das man{" "}
          <span className="text-cyan-300">spürt.</span>
        </motion.h2>

        <div className="relative mx-auto mt-12 min-h-[300px] max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 26, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -26, scale: 0.97 }}
              transition={{ duration: 0.45 }}
              className="rounded-[32px] border border-cyan-300/25 bg-white/[0.05] p-8 shadow-[0_0_70px_rgba(0,220,255,0.14)] backdrop-blur-xl"
            >
              <div className="mb-5 text-2xl text-cyan-300 drop-shadow-[0_0_18px_rgba(0,220,255,0.75)]">
                ★★★★★
              </div>

              <p className="text-xl leading-9 text-slate-200">
                “{review.text}”
              </p>

              <div className="mt-8">
                <p className="font-semibold text-white">{review.name}</p>
                <p className="text-sm text-slate-400">{review.type}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() =>
              setActive((active - 1 + reviews.length) % reviews.length)
            }
            className="absolute left-[-18px] top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/35 bg-[#06111d]/90 text-cyan-200 shadow-[0_0_25px_rgba(0,220,255,0.25)] md:flex"
          >
            ‹
          </button>

          <button
            onClick={() => setActive((active + 1) % reviews.length)}
            className="absolute right-[-18px] top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/35 bg-[#06111d]/90 text-cyan-200 shadow-[0_0_25px_rgba(0,220,255,0.25)] md:flex"
          >
            ›
          </button>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setActive(index)}
              className={`h-2.5 rounded-full transition-all ${
                active === index
                  ? "w-8 bg-cyan-300 shadow-[0_0_18px_rgba(0,220,255,0.8)]"
                  : "w-2.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}