"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Preloader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020711] text-white"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,220,255,0.18),transparent_38%)]" />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute h-36 w-36 rounded-full border border-cyan-300/20"
            />

            <motion.div
              animate={{
                boxShadow: [
                  "0 0 30px rgba(0,220,255,0.35)",
                  "0 0 70px rgba(0,220,255,0.95)",
                  "0 0 30px rgba(0,220,255,0.35)",
                ],
              }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-cyan-300/50 bg-white/[0.05] text-5xl font-black text-cyan-100 backdrop-blur-xl"
            >
              H
            </motion.div>

            <div className="mt-8 text-2xl font-semibold tracking-[0.25em]">
              HEXA<span className="text-cyan-300">CLEAN</span>
            </div>

            <div className="mt-4 text-xs uppercase tracking-[0.4em] text-slate-400">
              Premium Reinigung
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}