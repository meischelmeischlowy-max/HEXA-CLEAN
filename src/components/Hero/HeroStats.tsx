"use client";

import { motion } from "motion/react";

const stats = [
  { value: "500+", label: "Cleaned spaces" },
  { value: "24h", label: "Fast response" },
  { value: "100%", label: "Swiss precision" },
];

export default function HeroStats() {
  return (
    <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + index * 0.15 }}
        >
          <p className="bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-4xl font-black text-transparent">
            {stat.value}
          </p>

          <p className="mt-2 text-sm uppercase tracking-[0.25em] text-zinc-400">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}