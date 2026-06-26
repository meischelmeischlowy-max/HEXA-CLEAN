"use client";

import { useEffect, useState } from "react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const stats = [
  { value: 500, suffix: "+", label: "zufriedene Kunden" },
  { value: 2500, suffix: "+", label: "gereinigte Objekte" },
  { value: 24, suffix: "h", label: "schnelle Offerte" },
  { value: 99, suffix: "%", label: "Weiterempfehlung" },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 1400;
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const increment = value / totalSteps;

    const timer = setInterval(() => {
      start += increment;

      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export default function StatsBar() {
  return (
    <section className="relative overflow-hidden bg-[#020711] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-4 rounded-[32px] border border-cyan-300/20 bg-white/[0.04] p-5 shadow-[0_0_55px_rgba(0,220,255,0.12)] backdrop-blur-2xl md:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 text-center"
          >
            <div className="text-4xl font-bold text-cyan-300 drop-shadow-[0_0_18px_rgba(0,220,255,0.7)]">
              <Counter value={stat.value} suffix={stat.suffix} />
            </div>

            <div className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-300">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}