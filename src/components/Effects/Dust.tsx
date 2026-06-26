"use client";

import { motion } from "motion/react";

const particles = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 8 + ((i * 11) % 84),
  top: 12 + ((i * 17) % 72),
  size: i % 3 === 0 ? 2 : 1,
  delay: i * 0.35,
  duration: 7 + (i % 4),
}));

export default function Dust() {
  return (
    <>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-cyan-100/50"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, particle.id % 2 === 0 ? 8 : -8, 0],
            opacity: [0.05, 0.4, 0.05],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}