"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hexagon, Phone, Sparkles } from "lucide-react";

const nav = [
  { name: "Startseite", id: "startseite" },
  { name: "Leistungen", id: "services" },
  { name: "Vorher / Nachher", id: "before-after" },
  { name: "Kontakt", id: "quick-offer" },
];

function scrollToSection(id: string) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("startseite");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);

      const current = nav.findLast((item) => {
        const element = document.getElementById(item.id);
        if (!element) return false;

        return element.offsetTop - 160 <= window.scrollY;
      });

      if (current) setActive(current.id);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = (id: string) => {
    scrollToSection(id);
    setActive(id);
    setOpen(false);
  };

  return (
    <>
      <header className="fixed left-0 top-0 z-[100] w-full px-4 py-3">
        <motion.div
          animate={{
            backgroundColor: scrolled
              ? "rgba(2,7,17,0.9)"
              : "rgba(2,7,17,0.5)",
            boxShadow: scrolled
              ? "0 0 45px rgba(0,220,255,0.18)"
              : "0 0 28px rgba(0,220,255,0.1)",
          }}
          className="mx-auto flex max-w-7xl items-center justify-between overflow-hidden rounded-2xl border border-cyan-300/20 px-4 py-2.5 backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

          <button
            type="button"
            onClick={() => handleClick("startseite")}
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-11 w-11 items-center justify-center">
              <motion.div
                className="absolute inset-0 text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Hexagon size={44} strokeWidth={1.7} />
              </motion.div>

              <motion.div
                className="absolute inset-[7px] text-cyan-200/80"
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              >
                <Hexagon size={30} strokeWidth={1.4} />
              </motion.div>

              <span className="relative text-lg font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]">
                H
              </span>
            </div>

            <div className="leading-none">
              <div className="text-lg font-black tracking-[0.18em] text-white">
                HEXA
              </div>
              <div className="text-xs font-bold tracking-[0.35em] text-cyan-300">
                CLEAN
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 text-sm font-semibold text-slate-300 md:flex">
            {nav.map((item) => {
              const isActive = active === item.id;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className={`relative rounded-full px-4 py-2 transition ${
                    isActive ? "text-[#02101b]" : "hover:text-cyan-300"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.5)]"
                    />
                  )}
                  <span className="relative">{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href="tel:+41000000000"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-300"
            >
              <Phone size={15} />
              Telefon
            </a>

            <button
              type="button"
              onClick={() => handleClick("quick-offer")}
              className="group relative overflow-hidden rounded-xl border border-cyan-300/60 bg-cyan-300/10 px-5 py-2.5 text-sm font-black text-cyan-200 shadow-[0_0_25px_rgba(0,220,255,0.2)] transition hover:bg-cyan-300 hover:text-[#03101d]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition duration-700 group-hover:translate-x-full" />
              <span className="relative inline-flex items-center gap-2">
                <Sparkles size={15} />
                Offerte
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 text-cyan-200 md:hidden"
          >
            ☰
          </button>
        </motion.div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-0 z-[120] bg-[#020711]/96 px-6 py-6 text-white backdrop-blur-2xl md:hidden"
          >
            <div className="flex items-center justify-between">
              <div className="font-black tracking-[0.2em]">
                HEXA<span className="text-cyan-300"> CLEAN</span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-slate-300"
              >
                ×
              </button>
            </div>

            <nav className="mt-16 grid gap-6 text-3xl font-black">
              {nav.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className={`text-left transition ${
                    active === item.id ? "text-cyan-300" : "text-white"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            <div className="mt-12 grid gap-4">
              <a
                href="tel:+41000000000"
                className="rounded-xl border border-white/10 px-5 py-4 text-center font-bold"
              >
                Telefon
              </a>

              <button
                type="button"
                onClick={() => handleClick("quick-offer")}
                className="rounded-xl bg-cyan-300 px-5 py-4 text-center font-black text-[#02101b]"
              >
                Offerte anfordern
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}