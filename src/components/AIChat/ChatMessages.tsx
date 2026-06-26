"use client";

import { ChatMessage } from "./types";
import { User, Bot } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isThinking?: boolean;
}

export default function ChatMessages({
  messages,
  isThinking = false,
}: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {messages.map((message) => {
        const assistant = message.sender === "assistant";

        return (
          <div
            key={message.id}
            className={`flex ${assistant ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`flex max-w-[82%] gap-4 ${
                assistant ? "" : "flex-row-reverse"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                  assistant
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {assistant ? (
                  <Bot size={22} className="text-cyan-300" />
                ) : (
                  <User size={22} className="text-white" />
                )}
              </div>

              <div
                className={`rounded-3xl border px-6 py-5 ${
                  assistant
                    ? "border-white/10 bg-white/[0.05]"
                    : "border-cyan-400/20 bg-cyan-500/10"
                }`}
              >
                <p className="whitespace-pre-line leading-8 text-slate-200">
                  {message.text}
                </p>

                <div className="mt-3 text-right text-xs text-slate-500">
                  {message.time}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {isThinking && (
        <div className="flex justify-start">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <span className="text-slate-400">
              Analysiere Anfrage...
            </span>

            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300" />
              <span
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}