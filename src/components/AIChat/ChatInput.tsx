"use client";

import { useState } from "react";
import { SendHorizontal, Mic, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();

    if (!trimmed) return;

    onSendMessage(trimmed);
    setValue("");
  }

  return (
   <div className="mt-3 border-t border-white/10 bg-[#07111d] px-3 pt-4 pb-3">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-cyan-300"
        >
          <Paperclip size={17} />
        </button>

        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder="Nachricht eingeben..."
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />

        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-cyan-300"
        >
          <Mic size={17} />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-black transition hover:bg-cyan-300"
        >
          <SendHorizontal size={17} />
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-500">
        Finale Angebote werden persönlich bestätigt.
      </p>
    </div>
  );
}