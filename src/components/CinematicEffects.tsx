"use client";

import { motion } from "motion/react";

const dustParticles = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: 4 + ((i * 9) % 92),
  top: 10 + ((i * 17) % 76),
  size: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
  delay: i * 0.13,
  duration: 5 + (i % 7),
}));

const bokehParticles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 8 + ((i * 13) % 84),
  top: 12 + ((i * 19) % 70),
  delay: i * 0.55,
  size: 22 + (i % 4) * 10,
}));

export default function CinematicEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* deep cyan ambience */}
      <motion.div
        className="absolute left-[-18%] top-[4%] h-[620px] w-[620px] rounded-full bg-cyan-400/18 blur-[150px]"
        animate={{
          x: [0, 90, 30, 0],
          y: [0, -35, 55, 0],
          opacity: [0.18, 0.34, 0.18],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute right-[-12%] top-[34%] h-[460px] w-[460px] rounded-full bg-cyan-200/10 blur-[140px]"
        animate={{
          scale: [1, 1.22, 1],
          opacity: [0.1, 0.26, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* fog layer 1 */}
      <motion.div
        className="absolute bottom-[-150px] left-[-25%] h-[360px] w-[160%] bg-white/8 blur-[85px]"
        animate={{
          x: ["-8%", "7%", "-8%"],
          opacity: [0.1, 0.24, 0.1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* fog layer 2 */}
      <motion.div
        className="absolute bottom-[-40px] left-[-35%] h-[260px] w-[180%] bg-cyan-200/8 blur-[100px]"
        animate={{
          x: ["9%", "-9%", "9%"],
          opacity: [0.06, 0.2, 0.06],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* fog layer 3 */}
      <motion.div
        className="absolute bottom-[18%] left-[-20%] h-[180px] w-[140%] bg-white/5 blur-[120px]"
        animate={{
          x: ["-4%", "6%", "-4%"],
          y: [0, -20, 0],
          opacity: [0.04, 0.13, 0.04],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* cinematic diagonal light sweep */}
      <motion.div
        className="absolute top-[-25%] h-[150%] w-[24%] rotate-12 bg-gradient-to-r from-transparent via-cyan-100/16 to-transparent blur-2xl"
        initial={{ left: "-45%" }}
        animate={{ left: ["-45%", "125%"] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatDelay: 6,
          ease: "easeInOut",
        }}
      />

      {/* subtle white reflection sweep */}
      <motion.div
        className="absolute top-[8%] h-[120%] w-[18%] -rotate-12 bg-gradient-to-r from-transparent via-white/8 to-transparent blur-3xl"
        initial={{ right: "-40%" }}
        animate={{ right: ["-40%", "120%"] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          repeatDelay: 8,
          ease: "easeInOut",
        }}
      />

      {/* horizontal scan light */}
      <motion.div
        className="absolute left-0 top-[58%] h-px w-full bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent shadow-[0_0_28px_rgba(34,211,238,0.85)]"
        animate={{
          y: [-60, 70, -60],
          opacity: [0, 0.7, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* soft lens flare */}
      <motion.div
        className="absolute right-[18%] top-[24%] h-24 w-24 rounded-full bg-cyan-200/20 blur-2xl"
        animate={{
          opacity: [0.08, 0.26, 0.08],
          scale: [0.8, 1.25, 0.8],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute right-[24%] top-[30%] h-px w-52 bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
        animate={{
          opacity: [0, 0.75, 0],
          scaleX: [0.4, 1.2, 0.4],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* bokeh */}
      {bokehParticles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full border border-cyan-200/10 bg-cyan-200/5 blur-[1px]"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            height: particle.size,
            width: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.18, 0],
            scale: [0.8, 1.25, 0.8],
          }}
          transition={{
            duration: 8 + (particle.id % 5),
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* cinematic dust, not snow */}
      {dustParticles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-cyan-100/55 shadow-[0_0_10px_rgba(165,243,252,0.7)]"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            height: particle.size,
            width: particle.size,
          }}
          animate={{
            y: [0, -55, 0],
            x: [0, particle.id % 2 === 0 ? 14 : -14, 0],
            opacity: [0.02, 0.55, 0.02],
            scale: [0.65, 1.4, 0.65],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* depth vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.78)_100%)]" />

      {/* bottom cinematic shadow */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}