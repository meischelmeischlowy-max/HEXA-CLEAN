"use client";

import { useEffect, useState } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import AIChat from "./AIChat";

export default function AIChatLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <section
        id="ai-chat-launcher"
        className="relative overflow-hidden bg-[#020711] px-6 py-20 text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.16),transparent_36%)]" />

        <div className="relative z-10 mx-auto max-w-5xl rounded-[28px] border border-cyan-300/20 bg-white/[0.05] p-8 text-center shadow-[0_0_60px_rgba(0,220,255,0.14)] backdrop-blur-2xl">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            <Sparkles size={15} />
            HEXA AI Concierge
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] md:text-5xl">
            Digitale Beratung
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              direkt online starten.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Unser AI Concierge führt Sie Schritt für Schritt zur passenden
            Dienstleistung und erstellt eine erste unverbindliche Einschätzung.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-cyan-300 px-7 py-4 font-black text-[#02101b] shadow-[0_0_35px_rgba(0,220,255,0.45)] transition hover:scale-[1.03] hover:bg-white"
          >
            <Bot size={20} />
            Chat starten
          </button>
        </div>
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chat schließen"
            className="fixed right-5 top-5 z-[1001] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white transition hover:bg-cyan-300 hover:text-black"
          >
            <X size={22} />
          </button>

          <div className="h-screen overflow-y-auto px-4 py-5">
            <AIChat />
          </div>
        </div>
      )}
    </>
  );
}