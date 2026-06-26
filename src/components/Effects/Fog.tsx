"use client";

import { motion } from "motion/react";

export default function Fog() {
  return (
    <>
      <motion.div
        className="absolute left-[-20%] top-[5%] h-[520px] w-[520px] rounded-full bg-cyan-400/12 blur-[120px]"
        animate={{
          x: [0, 60, 0],
          y: [0, -20, 0],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute right-[-15%] bottom-[5%] h-[420px] w-[420px] rounded-full bg-cyan-300/8 blur-[100px]"
        animate={{
          x: [0, -40, 0],
          opacity: [0.08, 0.18, 0.08],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}