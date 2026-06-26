"use client";

import { Sparkles } from "lucide-react";

export default function ChatHeader() {
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-[#07111d] px-4 py-3">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
          <Sparkles
            size={22}
            className="text-cyan-300"
          />
        </div>

        <div>

          <h2 className="text-base font-bold text-white">
            HEXA AI Concierge
          </h2>

          <div className="mt-1 flex items-center gap-2">

            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

            <span className="text-xs text-slate-400">
              Online
            </span>

          </div>

        </div>

      </div>

      <div className="hidden lg:block text-right">

        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">
          AI Concierge
        </div>

        <div className="mt-1 text-[10px] text-slate-500">
          MM Digital Studio
        </div>

      </div>

    </div>
  );
}