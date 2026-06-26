"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ServiceCards from "./ServiceCards";
import ProgressPanelCompact from "./ProgressPanelCompact";
import ChatInput from "./ChatInput";
import {
  ChatMessage,
  ServiceType,
  START_MESSAGES,
} from "./types";

import { createInitialSession } from "@/lib/ai/conversation/flow";
import {
  processMessage,
  selectService,
} from "@/lib/ai/engine/AIEngine";

function getCurrentTime() {
  return new Date().toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AIChat() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(START_MESSAGES);

  const [selectedService, setSelectedService] =
    useState<ServiceType | undefined>();

  const [session, setSession] = useState(createInitialSession());
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chatEl = chatContainerRef.current;
    if (!chatEl) return;
    chatEl.scrollTop = chatEl.scrollHeight;
  }, [messages, isThinking]);

  function addUserMessage(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: "user",
        text,
        time: getCurrentTime(),
      },
    ]);
  }

  function addAssistantMessage(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: "assistant",
        text,
        time: getCurrentTime(),
      },
    ]);
  }

  function handleSelectService(service: ServiceType) {
    setSelectedService(service);

    const result = selectService(service, session);
    const serviceLabel = result.session.answers.serviceLabel ?? service;

    addUserMessage(serviceLabel);
    setSession(result.session);
    setIsThinking(true);

    window.setTimeout(() => {
      addAssistantMessage(result.reply);
      setIsThinking(false);
    }, 450);
  }

  function handleSendMessage(text: string) {
    if (!text.trim()) return;

    addUserMessage(text);
    setIsThinking(true);

    window.setTimeout(() => {
      const result = processMessage({
        message: text,
        session,
      });

      setSession(result.session);
      addAssistantMessage(result.reply);
      setIsThinking(false);
    }, 450);
  }

  return (
    <section
      id="ai-chat"
      className="relative overflow-hidden bg-[#020711] py-8 text-white"
    >
      <div className="relative mx-auto h-[700px] w-full max-w-[1450px] overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-black shadow-[0_0_70px_rgba(0,220,255,.16)]">
        <Image
          src="/team/michal-monika.webp"
          alt="Michal und Monika HEXA CLEAN"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-black/80" />

        <div className="absolute inset-0 grid grid-cols-[28%_36%_32%] gap-6 px-6 py-6 md:px-8 md:py-8">
          <div className="hidden flex-1 flex-col rounded-[2rem] border border-white/15 bg-[#02080f]/95 shadow-[0_0_55px_rgba(0,220,255,.18)] overflow-hidden md:flex">
            <div className="relative flex-1 overflow-hidden bg-black">
              <img
                src="/team/michal-monika.webp"
                alt="Michal und Monika HEXA CLEAN"
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-black/30" />

              <div className="absolute inset-x-4 bottom-4 p-0 text-xs text-white">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-200 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  Wir sind für <span className="text-cyan-300">Sie</span> da
                </p>
                <div className="mt-3 space-y-2">
                  <p className="flex items-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">✓</span>
                    Persönlich & zuverlässig
                  </p>
                  <p className="flex items-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">✓</span>
                    Schnelle Antwort
                  </p>
                  <p className="flex items-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">✓</span>
                    Transparente Preise
                  </p>
                </div>
                <div className="mt-4 text-sm text-cyan-100 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  <p className="text-2xl font-light italic text-cyan-50">Michal & Monika</p>
                  <p className="mt-1 text-cyan-100">Ihr HEXA CLEAN Team</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-[1.8rem] border border-white/15 bg-[#050b16]/90 shadow-[0_0_55px_rgba(0,220,255,.18)] backdrop-blur-xl">
            <ChatHeader />

            <div className="flex h-[calc(100%-70px)] flex-col">
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full flex-col">
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto"
                  >
                    <ChatMessages
                      messages={messages}
                      isThinking={isThinking}
                    />
                  </div>

                  <div className="border-t border-white/10 bg-black/20 px-4 pb-3 pt-3">
                    <ServiceCards
                      selectedService={selectedService}
                      onSelectService={handleSelectService}
                    />
                  </div>
                </div>
              </div>

              <ChatInput onSendMessage={handleSendMessage} />
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[1.8rem] border border-white/15 bg-[#050b16]/90 shadow-[0_0_55px_rgba(0,220,255,.18)] backdrop-blur-xl md:block">
            <ProgressPanelCompact
              progress={{
                service: session.answers.service,
                serviceLabel: session.answers.serviceLabel,
                area: session.answers.area,
                windows: session.answers.windows,
                floor: session.answers.floor,
                elevator: session.answers.elevator,
                date: session.answers.date,
                estimatedPrice: session.estimatedPrice,
                priceRange: session.priceRange,
                progress: session.progress,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
