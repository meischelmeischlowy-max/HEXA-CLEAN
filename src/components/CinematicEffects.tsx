"use client";

import { motion } from "motion/react";

const isMobile =
  typeof window !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const particles = isMobile ? 6 : 18;

export default function CinematicEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">

      {/* LEFT LIGHT */}
      <motion.div
        className="absolute left-[-15%] top-[8%] h-[380px] w-[380px] rounded-full bg-cyan-400/12 blur-[80px]"
        animate={{
          opacity: [0.10, 0.18, 0.10],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
        }}
      />

      {/* RIGHT LIGHT */}
      <motion.div
        className="absolute right-[-10%] bottom-[10%] h-[320px] w-[320px] rounded-full bg-cyan-300/10 blur-[65px]"
        animate={{
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
      />

      {/* LIGHT SWEEP */}
      {!isMobile && (
        <motion.div
          className="absolute top-[-20%] h-[150%] w-[16%] rotate-12 bg-gradient-to-r from-transparent via-cyan-200/12 to-transparent blur-xl"
          initial={{ left: "-35%" }}
          animate={{ left: ["-35%", "120%"] }}
          transition={{
            duration: 9,
            repeat: Infinity,
            repeatDelay: 7,
            ease: "easeInOut",
          }}
        />
      )}

      {/* DUST */}
      {Array.from({ length: particles }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-cyan-100/45"
          style={{
            left: `${8 + ((i * 11) % 82)}%`,
            top: `${15 + ((i * 17) % 65)}%`,
            width: isMobile ? 2 : 3,
            height: isMobile ? 2 : 3,
          }}
          animate={{
            y: [0, -28, 0],
            opacity: [0.05, 0.35, 0.05],
          }}
          transition={{
            duration: 6 + (i % 3),
            repeat: Infinity,
            delay: i * 0.25,
          }}
        />
      ))}

      {/* VIGNETTE */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,.72)_100%)]"/>

      {/* BOTTOM SHADOW */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent"/>

    </div>
  );
}