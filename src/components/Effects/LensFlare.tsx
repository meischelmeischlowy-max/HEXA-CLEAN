"use client";

import { motion } from "motion/react";

export default function LensFlare() {
  return (
    <>
      <motion.div
        className="absolute right-[16%] top-[22%] h-24 w-24 rounded-full bg-cyan-200/15 blur-2xl"
        animate={{
          opacity: [0.08, 0.22, 0.08],
          scale: [0.9, 1.15, 0.9],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute right-[20%] top-[28%] h-px w-40 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
        animate={{
          opacity: [0, 0.6, 0],
          scaleX: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}