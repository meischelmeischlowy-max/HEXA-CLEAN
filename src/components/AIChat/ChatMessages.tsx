"use client";

import {
  Bot,
  User,
} from "lucide-react";

import {
  ChatMessage,
} from "./types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isThinking?: boolean;
}

export default function ChatMessages({
  messages,
  isThinking = false,
}: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-4 p-3 sm:p-5">
      {messages.map((message) => {
        const assistant =
          message.sender ===
          "assistant";

        return (
          <div
            key={message.id}
            className={`flex ${
              assistant
                ? "justify-start"
                : "justify-end"
            }`}
          >
            <div
              className={`flex max-w-[94%] items-end gap-2 sm:max-w-[84%] ${
                assistant
                  ? ""
                  : "flex-row-reverse"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${
                  assistant
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {assistant ? (
                  <Bot
                    size={18}
                    className="text-cyan-300"
                  />
                ) : (
                  <User
                    size={18}
                    className="text-white"
                  />
                )}
              </div>

              <div
                className={`rounded-2xl border px-4 py-3 ${
                  assistant
                    ? "border-white/10 bg-white/[0.05]"
                    : "border-cyan-400/20 bg-cyan-500/10"
                }`}
              >
                <p className="whitespace-pre-line text-sm leading-6 text-slate-200 sm:text-base">
                  {message.text}
                </p>

                <div className="mt-1 text-right text-[10px] text-slate-500">
                  {message.time}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {isThinking ? (
        <div className="flex justify-start">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="text-sm text-slate-400">
              Antwort wird erstellt...
            </span>

            <div className="flex gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-300" />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-cyan-300"
                style={{
                  animationDelay:
                    "150ms",
                }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-cyan-300"
                style={{
                  animationDelay:
                    "300ms",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
