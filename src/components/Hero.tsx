"use client";

import { motion } from "motion/react";

export default function CinematicEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">

      {/* DESKTOP */}
      <div className="hidden md:block">

        <motion.div
          className="absolute left-[-15%] top-[8%] h-[420px] w-[420px] rounded-full bg-cyan-400/12 blur-[90px]"
          animate={{ opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 7, repeat: Infinity }}
        />

        <motion.div
          className="absolute right-[-10%] bottom-[10%] h-[340px] w-[340px] rounded-full bg-cyan-300/10 blur-[70px]"
          animate={{ opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <motion.div
          className="absolute top-[-20%] h-[150%] w-[16%] rotate-12 bg-gradient-to-r from-transparent via-cyan-200/12 to-transparent blur-xl"
          initial={{ left: "-35%" }}
          animate={{ left: ["-35%", "120%"] }}
          transition={{
            duration: 9,
            repeat: Infinity,
            repeatDelay: 7,
          }}
        />

        {Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-cyan-100/45"
            style={{
              left: `${8 + ((i * 11) % 82)}%`,
              top: `${15 + ((i * 17) % 65)}%`,
              width: 3,
              height: 3,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.05, 0.4, 0.05],
            }}
            transition={{
              duration: 6 + (i % 3),
              repeat: Infinity,
              delay: i * 0.25,
            }}
          />
        ))}
      </div>

      {/* MOBILE - LEKKA WERSJA */}
      <div className="md:hidden">

        <div className="absolute left-[-12%] top-[10%] h-[220px] w-[220px] rounded-full bg-cyan-400/10 blur-[45px]" />

        <div className="absolute right-[-10%] bottom-[15%] h-[180px] w-[180px] rounded-full bg-cyan-300/8 blur-[35px]" />

      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,.72)_100%)]" />

      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent" />

    </div>
  );
}