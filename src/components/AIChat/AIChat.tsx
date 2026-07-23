"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import ProgressPanelCompact from "./ProgressPanelCompact";
import ServiceCards from "./ServiceCards";
import {
  ChatMessage,
  ServiceType,
  START_MESSAGES,
} from "./types";

import {
  createInitialSession,
} from "@/lib/ai/conversation/flow";
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
  return new Date().toLocaleTimeString(
    "de-CH",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getLeadStatusText(
  status: LeadSubmitStatus,
) {
  if (status === "submitting") {
    return "Anfrage wird sicher im CRM gespeichert...";
  }

  if (status === "success") {
    return "Anfrage wurde gespeichert. HEXA CLEAN meldet sich persönlich.";
  }

  if (status === "partial") {
    return "Anfrage wurde gespeichert. Die E-Mail-Benachrichtigung muss geprüft werden.";
  }

  if (status === "error") {
    return "Anfrage konnte nicht gespeichert werden.";
  }

  return "";
}

export default function AIChat() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(START_MESSAGES);

  const [
    selectedService,
    setSelectedService,
  ] = useState<ServiceType | undefined>();

  const [session, setSession] =
    useState(createInitialSession());

  const [isThinking, setIsThinking] =
    useState(false);

  const [leadName, setLeadName] =
    useState("");

  const [leadContact, setLeadContact] =
    useState("");

  const [leadStatus, setLeadStatus] =
    useState<LeadSubmitStatus>("idle");

  const [leadError, setLeadError] =
    useState<string | null>(null);

  const [leadCrm, setLeadCrm] =
    useState<
      ChatLeadApiResponse["crm"] | null
    >(null);

  const chatContainerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chatElement =
      chatContainerRef.current;

    if (!chatElement) {
      return;
    }

    chatElement.scrollTop =
      chatElement.scrollHeight;
  }, [messages, isThinking]);

  function resetLeadSubmitState() {
    if (leadStatus === "submitting") {
      return;
    }

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

  function addAssistantMessage(
    text: string,
  ) {
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

  function handleSelectService(
    service: ServiceType,
  ) {
    resetLeadSubmitState();
    setSelectedService(service);

    const result = selectService(
      service,
      session,
    );

    const serviceLabel =
      result.session.answers
        .serviceLabel ?? service;

    addUserMessage(serviceLabel);
    setSession(result.session);
    setIsThinking(true);

    window.setTimeout(() => {
      addAssistantMessage(result.reply);
      setIsThinking(false);
    }, 350);
  }

  function handleSendMessage(
    text: string,
  ) {
    const message = text.trim();

    if (!message || isThinking) {
      return;
    }

    resetLeadSubmitState();
    addUserMessage(message);
    setIsThinking(true);

    window.setTimeout(() => {
      const result = processMessage({
        message,
        session,
      });

      setSession(result.session);
      addAssistantMessage(result.reply);
      setIsThinking(false);
    }, 350);
  }

  async function handleSubmitLead(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (leadStatus === "submitting") {
      return;
    }

    const name = leadName.trim();
    const contact = leadContact.trim();

    if (!session.completed) {
      setLeadStatus("error");
      setLeadError(
        "Bitte schliessen Sie die Anfrage im Chat zuerst ab.",
      );
      return;
    }

    if (!contact) {
      setLeadStatus("error");
      setLeadError(
        "Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse ein.",
      );
      return;
    }

    setLeadStatus("submitting");
    setLeadError(null);
    setLeadCrm(null);

    try {
      const response = await fetch(
        "/api/public/chat/lead",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name || null,
            contact,
            session,
            messages,
            pageUrl:
              typeof window !==
              "undefined"
                ? window.location.href
                : null,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | ChatLeadApiResponse
        | null;

      if (
        !response.ok ||
        !payload?.success
      ) {
        setLeadStatus("error");
        setLeadError(
          payload?.error ??
            "Die Anfrage konnte nicht gespeichert werden.",
        );
        return;
      }

      setLeadCrm(payload.crm ?? null);
      setLeadStatus(
        payload.emailSent
          ? "success"
          : "partial",
      );
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
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#020711] text-white"
    >
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col border-white/10 lg:border-r">
          <ChatHeader />

          <div
            ref={chatContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <ChatMessages
              messages={messages}
              isThinking={isThinking}
            />
          </div>

          <div className="max-h-[46vh] shrink-0 overflow-y-auto border-t border-white/10 bg-[#050b16] px-3 py-3 sm:px-4">
            <ServiceCards
              selectedService={
                selectedService
              }
              onSelectService={
                handleSelectService
              }
            />

            {session.completed ? (
              <form
                onSubmit={
                  handleSubmitLead
                }
                className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Anfrage senden
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Die Angaben werden im CRM
                  gespeichert. Die endgültige
                  Offerte wird persönlich geprüft.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    value={leadName}
                    onChange={(event) =>
                      setLeadName(
                        event.target.value,
                      )
                    }
                    disabled={
                      leadSubmitDisabled
                    }
                    maxLength={160}
                    placeholder="Name, optional"
                    autoComplete="name"
                    className="h-11 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60 disabled:opacity-60"
                  />

                  <input
                    value={leadContact}
                    onChange={(event) =>
                      setLeadContact(
                        event.target.value,
                      )
                    }
                    disabled={
                      leadSubmitDisabled
                    }
                    maxLength={240}
                    placeholder="Telefon oder E-Mail"
                    autoComplete="email"
                    className="h-11 rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60 disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    leadSubmitDisabled
                  }
                  className="mt-2 h-11 w-full rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {leadStatus ===
                  "submitting"
                    ? "Wird gespeichert..."
                    : leadStatus ===
                          "success" ||
                        leadStatus ===
                          "partial"
                      ? "Gespeichert"
                      : "Anfrage senden"}
                </button>

                {leadStatus !== "idle" ? (
                  <div
                    className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${
                      leadStatus ===
                      "error"
                        ? "border-red-400/30 bg-red-500/10 text-red-100"
                        : leadStatus ===
                            "partial"
                          ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                          : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                    }`}
                  >
                    <p>
                      {getLeadStatusText(
                        leadStatus,
                      )}
                    </p>

                    {leadError ? (
                      <p className="mt-1">
                        {leadError}
                      </p>
                    ) : null}

                    {leadCrm ? (
                      <p className="mt-1 text-white/70">
                        Anfrage:{" "}
                        {
                          leadCrm.orderNumber
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ) : (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-400">
                Beantworten Sie die Fragen.
                Danach können Sie die Anfrage
                direkt an HEXA CLEAN senden.
              </p>
            )}
          </div>

          <ChatInput
            onSendMessage={
              handleSendMessage
            }
            disabled={isThinking}
          />
        </div>

        <div className="hidden min-h-0 overflow-y-auto bg-[#050b16] p-4 lg:block">
          <ProgressPanelCompact
            progress={{
              service:
                session.answers.service,
              serviceLabel:
                session.answers
                  .serviceLabel,
              area:
                session.answers.area,
              windows:
                session.answers.windows,
              floor:
                session.answers.floor,
              elevator:
                session.answers
                  .elevator,
              date:
                session.answers.date,
              estimatedPrice:
                session.estimatedPrice,
              priceRange:
                session.priceRange,
              progress:
                session.progress,
            }}
          />
        </div>
      </div>
    </section>
  );
}
