"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";

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

type LeadSubmitStatus =
  | "idle"
  | "submitting"
  | "success"
  | "partial"
  | "error";

type ChatLeadApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  emailSent?: boolean;
  crm?: {
    customerId: string;
    sessionId: string;
    orderId: string;
    orderNumber: string;
    estimateId: string;
    estimateNumber: string;
    notificationId: string;
  };
};

function getCurrentTime() {
  return new Date().toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLeadStatusText(status: LeadSubmitStatus) {
  if (status === "submitting") {
    return "Anfrage wird sicher im CRM gespeichert...";
  }

  if (status === "success") {
    return "Anfrage wurde im CRM gespeichert. HEXA CLEAN meldet sich persönlich.";
  }

  if (status === "partial") {
    return "Anfrage wurde im CRM gespeichert. Die E-Mail-Benachrichtigung muss geprüft werden.";
  }

  if (status === "error") {
    return "Anfrage konnte nicht gespeichert werden.";
  }

  return "";
}

export default function AIChat() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(START_MESSAGES);

  const [selectedService, setSelectedService] =
    useState<ServiceType | undefined>();

  const [session, setSession] = useState(createInitialSession());
  const [isThinking, setIsThinking] = useState(false);

  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [leadStatus, setLeadStatus] =
    useState<LeadSubmitStatus>("idle");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadCrm, setLeadCrm] =
    useState<ChatLeadApiResponse["crm"] | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chatEl = chatContainerRef.current;
    if (!chatEl) return;
    chatEl.scrollTop = chatEl.scrollHeight;
  }, [messages, isThinking]);

  function resetLeadSubmitState() {
    if (leadStatus === "submitting") return;

    setLeadStatus("idle");
    setLeadError(null);
    setLeadCrm(null);
  }

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
    resetLeadSubmitState();
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

    resetLeadSubmitState();
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

  async function handleSubmitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (leadStatus === "submitting") return;

    const name = leadName.trim();
    const contact = leadContact.trim();

    if (!session.completed) {
      setLeadStatus("error");
      setLeadError("Bitte schliessen Sie die Anfrage im Chat zuerst ab.");
      return;
    }

    if (!contact) {
      setLeadStatus("error");
      setLeadError("Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse ein.");
      return;
    }

    setLeadStatus("submitting");
    setLeadError(null);
    setLeadCrm(null);

    try {
      const response = await fetch("/api/public/chat/lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name || null,
          contact,
          session,
          messages,
          pageUrl:
            typeof window !== "undefined"
              ? window.location.href
              : null,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as ChatLeadApiResponse | null;

      if (!response.ok || !payload?.success) {
        setLeadStatus("error");
        setLeadError(
          payload?.error ??
            "Die Anfrage konnte nicht gespeichert werden.",
        );
        return;
      }

      setLeadCrm(payload.crm ?? null);
      setLeadStatus(payload.emailSent ? "success" : "partial");
    } catch {
      setLeadStatus("error");
      setLeadError(
        "Die Anfrage konnte wegen eines Verbindungsfehlers nicht gespeichert werden.",
      );
    }
  }

  const leadSubmitDisabled =
    leadStatus === "submitting" ||
    leadStatus === "success" ||
    leadStatus === "partial";

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
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                      ✓
                    </span>
                    Persönlich & zuverlässig
                  </p>
                  <p className="flex items-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                      ✓
                    </span>
                    Schnelle Antwort
                  </p>
                  <p className="flex items-center gap-2 text-cyan-100 drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                      ✓
                    </span>
                    Transparente Preise
                  </p>
                </div>

                <div className="mt-4 text-sm text-cyan-100 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  <p className="text-2xl font-light italic text-cyan-50">
                    Michal & Monika
                  </p>
                  <p className="mt-1 text-cyan-100">
                    Ihr HEXA CLEAN Team
                  </p>
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

                    {session.completed ? (
                      <form
                        onSubmit={handleSubmitLead}
                        className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-3"
                      >
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                            Anfrage senden
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-cyan-50/75">
                            Die Angaben werden sicher im CRM gespeichert.
                            Die finale Offerte wird von HEXA CLEAN manuell geprüft.
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <input
                            value={leadName}
                            onChange={(event) =>
                              setLeadName(event.target.value)
                            }
                            disabled={leadSubmitDisabled}
                            maxLength={160}
                            placeholder="Name, optional"
                            className="h-10 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <input
                            value={leadContact}
                            onChange={(event) =>
                              setLeadContact(event.target.value)
                            }
                            disabled={leadSubmitDisabled}
                            maxLength={240}
                            placeholder="Telefon oder E-Mail"
                            className="h-10 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <button
                            type="submit"
                            disabled={leadSubmitDisabled}
                            className="h-10 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-300/40 disabled:text-slate-950/60"
                          >
                            {leadStatus === "submitting"
                              ? "Wird gespeichert..."
                              : leadStatus === "success" ||
                                  leadStatus === "partial"
                                ? "Gespeichert"
                                : "Anfrage im CRM speichern"}
                          </button>
                        </div>

                        {leadStatus !== "idle" ? (
                          <div
                            className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                              leadStatus === "error"
                                ? "border-red-400/30 bg-red-500/10 text-red-100"
                                : leadStatus === "partial"
                                  ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                                  : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                            }`}
                          >
                            <p>{getLeadStatusText(leadStatus)}</p>

                            {leadError ? (
                              <p className="mt-1 text-red-100/90">
                                {leadError}
                              </p>
                            ) : null}

                            {leadCrm ? (
                              <div className="mt-2 space-y-1 text-white/75">
                                <p>Order: {leadCrm.orderNumber}</p>
                                <p>Estimate: {leadCrm.estimateNumber}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </form>
                    ) : (
                      <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-white/50">
                        Nach der Zusammenfassung können Sie die Anfrage
                        direkt an HEXA CLEAN senden.
                      </p>
                    )}
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