"use client";

import { motion } from "motion/react";

export default function CinematicMobile() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden md:hidden">

      <motion.div
        className="absolute left-[-20%] top-[10%] h-[280px] w-[280px] rounded-full bg-cyan-300/12 blur-[70px]"
        animate={{
          opacity: [0.12, 0.2, 0.12],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
      />

      <motion.div
        className="absolute right-[-10%] bottom-[12%] h-[220px] w-[220px] rounded-full bg-cyan-200/10 blur-[55px]"
        animate={{
          opacity: [0.08, 0.16, 0.08],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,.82)_100%)]" />

      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 to-transparent" />

    </div>
  );
}