"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Bot,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";

import AIChat from "./AIChat";

export default function AIChatLauncher() {
  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  return (
    <>
      <section
        id="ai-chat-launcher"
        className="relative overflow-hidden bg-[#020711] px-5 py-16 text-white sm:px-6 sm:py-20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.16),transparent_38%)]" />

        <div className="relative z-10 mx-auto max-w-5xl rounded-[28px] border border-cyan-300/20 bg-white/[0.05] p-6 text-center shadow-[0_0_60px_rgba(0,220,255,0.14)] backdrop-blur-2xl sm:p-8">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
            <Sparkles size={15} />
            HEXA CLEAN Chat
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] md:text-5xl">
            Anfrage direkt
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              im Chat besprechen.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Der digitale Assistent fragt
            die wichtigsten Angaben ab,
            berechnet eine unverbindliche
            Orientierung und speichert Ihre
            Anfrage sicher im CRM.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-7 py-3 font-black text-[#02101b] shadow-[0_0_35px_rgba(0,220,255,0.45)] transition hover:scale-[1.03] hover:bg-white"
          >
            <MessageCircle size={20} />
            Chat starten
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="HEXA CLEAN Chat öffnen"
        className="fixed bottom-4 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-300 text-[#02101b] shadow-[0_0_35px_rgba(0,220,255,0.5)] transition hover:scale-105 hover:bg-white sm:bottom-6 sm:right-6"
      >
        <Bot size={25} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="HEXA CLEAN Chat"
          className="fixed inset-0 z-[999] bg-black/80 p-0 backdrop-blur-md sm:p-4"
        >
          <div className="mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-[#020711] sm:h-[calc(100dvh-2rem)] sm:max-w-6xl sm:rounded-[28px] sm:border sm:border-cyan-300/25 sm:shadow-[0_0_70px_rgba(0,220,255,0.25)]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#07111d] px-4">
              <div>
                <p className="text-sm font-bold text-white">
                  HEXA CLEAN Chat
                </p>
                <p className="text-xs text-emerald-300">
                  Online
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Chat schliessen"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition hover:bg-cyan-300 hover:text-black"
              >
                <X size={21} />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <AIChat />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
