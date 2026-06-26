"use client";

import { motion } from "motion/react";

export default function LightSweep() {
  return (
    <>
      {/* główna smuga światła */}
      <motion.div
        className="absolute top-[-25%] h-[150%] w-[18%] rotate-12 bg-gradient-to-r from-transparent via-cyan-200/15 to-transparent blur-2xl"
        initial={{ left: "-35%" }}
        animate={{ left: ["-35%", "120%"] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatDelay: 7,
          ease: "easeInOut",
        }}
      />

      {/* delikatna kontra */}
      <motion.div
        className="absolute top-[10%] h-[120%] w-[12%] -rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent blur-3xl"
        initial={{ right: "-30%" }}
        animate={{ right: ["-30%", "120%"] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatDelay: 10,
          ease: "easeInOut",
        }}
      />
    </>
  );
}