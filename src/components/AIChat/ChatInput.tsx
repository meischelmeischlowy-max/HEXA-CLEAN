"use client";

import {
  useState,
} from "react";
import {
  SendHorizontal,
} from "lucide-react";

interface ChatInputProps {
  onSendMessage: (
    text: string,
  ) => void;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] =
    useState("");

  function handleSubmit() {
    const trimmed = value.trim();

    if (!trimmed || disabled) {
      return;
    }

    onSendMessage(trimmed);
    setValue("");
  }

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#07111d] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <textarea
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            setValue(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ihre Nachricht..."
          aria-label="Nachricht"
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base text-white outline-none placeholder:text-slate-500 disabled:opacity-50 sm:text-sm"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            disabled ||
            !value.trim()
          }
          aria-label="Nachricht senden"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizontal size={19} />
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-500">
        Die endgültige Offerte wird
        persönlich geprüft.
      </p>
    </div>
  );
}
