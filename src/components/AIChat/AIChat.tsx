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

type LeadSubmitStatus =
  | "idle"
  | "submitting"
  | "success"
  | "partial"
  | "error";

type OnlineBeraterLead = {
  service: string | null;
  objectType: string | null;
  location: string | null;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  windows?: number | null;
  floor: number | null;
  elevator: boolean | null;
  parkingAccess: string | null;
  condition: string | null;
  frequency: string | null;
  extras: string[];
  preferredDate: string | null;
  flexibleDate: boolean | null;
  photoRequired: boolean | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
};

type OnlineBeraterResult = {
  reply: string;
  lead: OnlineBeraterLead;
  missingFields: string[];
  leadReady: boolean;
  shouldCreateLead: boolean;
  shouldAskForPhotos: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

type OnlineBeraterApiResponse = {
  success?: boolean;
  result?: OnlineBeraterResult;
  error?: string;
};

type ChatCentralPricing = {
  min: number;
  max: number;
  estimatedPrice: number;
  priceRange: string;
  confidence:
    | "LOW"
    | "MEDIUM"
    | "HIGH";
  requiresPhotoReview: boolean;
};

type ChatPricingApiResponse = {
  success?: boolean;
  pricing?: ChatCentralPricing;
  error?: string;
};

type ChatLeadApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  emailSent?: boolean;
  customerEmailSent?: boolean;
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

type CompatibleChatSession = {
  lead: OnlineBeraterLead | null;
  answers: {
    service?: ServiceType;
    serviceLabel?: string;
    objectType?: string;
    location?: string;
    area?: number;
    rooms?: number;
    bathrooms?: number;
    windows?: number;
    floor?: string;
    elevator?: boolean;
    parkingAccess?: string;
    condition?: string;
    frequency?: string;
    extras?: string[];
    preferredDate?: string;
    flexibleDate?: boolean;
    photoRequired?: boolean;
    oven?: boolean;
    balcony?: boolean;
    description?: string;
    date?: string;
  };
  progress: number;
  estimatedPrice: number;
  priceRange: string;
  completed: boolean;
};

const EMPTY_SESSION: CompatibleChatSession = {
  lead: null,
  answers: {},
  progress: 0,
  estimatedPrice: 0,
  priceRange: "Wird nach Prüfung berechnet",
  completed: false,
};

const SERVICE_LABELS: Record<
  ServiceType,
  string
> = {
  reinigung: "Reinigung",
  fenster: "Fensterreinigung",
  hauswartung: "Hauswartung",
  umzug: "Umzugsreinigung",
  kleinreparaturen: "Kleinreparaturen",
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

function mapServiceType(
  service: string | null,
): ServiceType | undefined {
  const normalized =
    service?.toLocaleLowerCase("de-CH") ?? "";

  if (
    normalized.includes("umzug") ||
    normalized.includes("abgabe")
  ) {
    return "umzug";
  }

  if (normalized.includes("fenster")) {
    return "fenster";
  }

  if (
    normalized.includes("hauswart") ||
    normalized.includes("gebäude")
  ) {
    return "hauswartung";
  }

  if (
    normalized.includes("reparatur") ||
    normalized.includes("montage")
  ) {
    return "kleinreparaturen";
  }

  if (
    normalized.includes("reinigung") ||
    normalized.includes("wohnung") ||
    normalized.includes("büro")
  ) {
    return "reinigung";
  }

  return undefined;
}

function buildDescription(
  lead: OnlineBeraterLead,
) {
  const details = [
    lead.objectType
      ? `Objekt: ${lead.objectType}`
      : null,
    lead.location
      ? `Ort: ${lead.location}`
      : null,
    lead.rooms !== null
      ? `Zimmer: ${lead.rooms}`
      : null,
    lead.bathrooms !== null
      ? `Badezimmer: ${lead.bathrooms}`
      : null,
    lead.parkingAccess
      ? `Zugang/Parkplatz: ${lead.parkingAccess}`
      : null,
    lead.condition
      ? `Zustand: ${lead.condition}`
      : null,
    lead.extras.length > 0
      ? `Zusatzleistungen: ${lead.extras.join(", ")}`
      : null,
    lead.photoRequired === true
      ? "Fotos erforderlich"
      : null,
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  return details.join("\n");
}

function calculateProgress(
  result: OnlineBeraterResult,
) {
  if (result.leadReady) {
    return 100;
  }

  const totalFields =
    result.missingFields.length + 1;

  const completedFields = Math.max(
    1,
    12 - result.missingFields.length,
  );

  return Math.min(
    95,
    Math.max(
      10,
      Math.round(
        (completedFields /
          Math.max(totalFields, 12)) *
          100,
      ),
    ),
  );
}


function mergeOnlineBeraterLead(
  previous: OnlineBeraterLead | null,
  incoming: OnlineBeraterLead,
): OnlineBeraterLead {
  return {
    service:
      incoming.service ??
      previous?.service ??
      null,
    objectType:
      incoming.objectType ??
      previous?.objectType ??
      null,
    location:
      incoming.location ??
      previous?.location ??
      null,
    areaM2:
      incoming.areaM2 ??
      previous?.areaM2 ??
      null,
    rooms:
      incoming.rooms ??
      previous?.rooms ??
      null,
    bathrooms:
      incoming.bathrooms ??
      previous?.bathrooms ??
      null,
    windows:
      incoming.windows ??
      previous?.windows ??
      null,
    floor:
      incoming.floor ??
      previous?.floor ??
      null,
    elevator:
      incoming.elevator ??
      previous?.elevator ??
      null,
    parkingAccess:
      incoming.parkingAccess ??
      previous?.parkingAccess ??
      null,
    condition:
      incoming.condition ??
      previous?.condition ??
      null,
    frequency:
      incoming.frequency ??
      previous?.frequency ??
      null,
    extras: Array.from(
      new Set([
        ...(previous?.extras ?? []),
        ...incoming.extras,
      ]),
    ),
    preferredDate:
      incoming.preferredDate ??
      previous?.preferredDate ??
      null,
    flexibleDate:
      incoming.flexibleDate ??
      previous?.flexibleDate ??
      null,
    photoRequired:
      incoming.photoRequired ??
      previous?.photoRequired ??
      null,
    customerName:
      incoming.customerName ??
      previous?.customerName ??
      null,
    email:
      incoming.email ??
      previous?.email ??
      null,
    phone:
      incoming.phone ??
      previous?.phone ??
      null,
  };
}

function createCompatibleSession(
  result: OnlineBeraterResult,
  pricing: ChatCentralPricing | null = null,
  previousSession: CompatibleChatSession | null = null,
): CompatibleChatSession {
  const lead = mergeOnlineBeraterLead(
    previousSession?.lead ?? null,
    result.lead,
  );
  const serviceType = mapServiceType(
    lead.service,
  );

  const date =
    lead.preferredDate ??
    (lead.flexibleDate === true
      ? "Flexibel"
      : undefined);

  return {
    lead:
      lead,
    answers: {
      service:
        serviceType,
      serviceLabel:
        lead.service ??
        (serviceType
          ? SERVICE_LABELS[serviceType]
          : undefined),
      objectType:
        lead.objectType ??
        undefined,
      location:
        lead.location ??
        undefined,
      area:
        lead.areaM2 ??
        undefined,
      rooms:
        lead.rooms ??
        undefined,
      bathrooms:
        lead.bathrooms ??
        undefined,
      windows:
        lead.windows ??
        undefined,
      floor:
        lead.floor !== null
          ? String(
              lead.floor,
            )
          : undefined,
      elevator:
        lead.elevator ??
        undefined,
      parkingAccess:
        lead.parkingAccess ??
        undefined,
      condition:
        lead.condition ??
        undefined,
      frequency:
        lead.frequency ??
        undefined,
      extras:
        lead.extras,
      preferredDate:
        lead.preferredDate ??
        undefined,
      flexibleDate:
        lead.flexibleDate ??
        undefined,
      photoRequired:
        lead.photoRequired ??
        undefined,
      oven:
        lead.extras.some(
          (extra) =>
            extra.toLocaleLowerCase(
              "de-CH",
            ).includes("backofen"),
        ),
      balcony:
        lead.extras.some(
          (extra) =>
            extra.toLocaleLowerCase(
              "de-CH",
            ).includes("balkon"),
        ),
      description:
        buildDescription(
          lead,
        ) || undefined,
      date,
    },
    progress: calculateProgress(result),
    estimatedPrice:
      pricing?.estimatedPrice ?? 0,
    priceRange:
      pricing?.priceRange ??
      "Wird nach persönlicher Prüfung berechnet",
    completed: result.leadReady,
  };
}

function toApiMessages(
  messages: ChatMessage[],
) {
  return messages.map((message) => ({
    role:
      message.sender === "user"
        ? ("user" as const)
        : ("assistant" as const),
    content: message.text,
  }));
}

async function fetchChatLead(
  body: Record<string, unknown>,
) {
  const controller =
    new AbortController();

  const timeout =
    window.setTimeout(
      () => controller.abort(),
      25_000,
    );

  try {
    return await fetch(
      "/api/public/chat/lead",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify(body),
        signal:
          controller.signal,
      },
    );
  } finally {
    window.clearTimeout(
      timeout,
    );
  }
}

export default function AIChat() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(START_MESSAGES);

  const [
    selectedService,
    setSelectedService,
  ] = useState<ServiceType | undefined>();

  const [session, setSession] =
    useState<CompatibleChatSession>(
      EMPTY_SESSION,
    );

  const [isThinking, setIsThinking] =
    useState(false);

  const [chatError, setChatError] =
    useState<string | null>(null);

  const [leadName, setLeadName] =
    useState("");

  const [leadContact, setLeadContact] =
    useState("");

  const [leadStatus, setLeadStatus] =
    useState<LeadSubmitStatus>("idle");

  const [
    shouldAutoCreateLead,
    setShouldAutoCreateLead,
  ] = useState(false);

  const [leadError, setLeadError] =
    useState<string | null>(null);

  const [leadCrm, setLeadCrm] =
    useState<
      ChatLeadApiResponse["crm"] | null
    >(null);

  const chatContainerRef =
    useRef<HTMLDivElement | null>(null);

  const autoLeadFingerprintRef =
    useRef<string | null>(null);

  useEffect(() => {
    const chatElement =
      chatContainerRef.current;

    if (!chatElement) {
      return;
    }

    chatElement.scrollTop =
      chatElement.scrollHeight;
  }, [messages, isThinking]);

  useEffect(() => {
    const name =
      leadName.trim();

    const contact =
      leadContact.trim();

    if (
      !shouldAutoCreateLead ||
      !contact ||
      leadStatus !== "idle" ||
      messages.length < 2
    ) {
      return;
    }

    const fingerprint = [
      contact.toLocaleLowerCase(
        "de-CH",
      ),
      session.answers.serviceLabel ??
        "",
      String(
        session.answers.area ?? "",
      ),
      session.answers.date ?? "",
    ].join("|");

    if (
      autoLeadFingerprintRef.current ===
      fingerprint
    ) {
      return;
    }

    autoLeadFingerprintRef.current =
      fingerprint;

    let cancelled = false;

    async function saveAutomatically() {
      setLeadStatus("submitting");
      setLeadError(null);
      setLeadCrm(null);

      try {
        const response =
          await fetchChatLead({
                name: name || null,
                contact,
                session,
                lead:
                  session.lead,
                messages,
                pageUrl:
                  typeof window !==
                  "undefined"
                    ? window.location.href
                    : null,              });

        const payload =
          (await response
            .json()
            .catch(() => null)) as
            | ChatLeadApiResponse
            | null;

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !payload?.success
        ) {
          autoLeadFingerprintRef.current =
            null;

          setLeadStatus("error");

          setLeadError(
            payload?.error ??
              "Die Anfrage konnte nicht automatisch gespeichert werden.",
          );

          return;
        }

        setLeadCrm(
          payload.crm ?? null,
        );

        setShouldAutoCreateLead(
          false,
        );

        setLeadStatus(
          payload.emailSent
            ? "success"
            : "partial",
        );
      } catch {
        if (cancelled) {
          return;
        }

        autoLeadFingerprintRef.current =
          null;

        setLeadStatus("error");

        setLeadError(
          "Die Anfrage konnte nicht best?tigt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie HEXA CLEAN direkt.",
        );
      }
    }

    void saveAutomatically();

    return () => {
      cancelled = true;
    };
  }, [
    leadContact,
    leadName,
    leadStatus,
    messages,
    session,
    shouldAutoCreateLead,
  ]);

  function resetLeadSubmitState() {
    if (
      leadStatus === "submitting" ||
      leadStatus === "success" ||
      leadStatus === "partial"
    ) {
      return;
    }

    setLeadStatus("idle");
    setLeadError(null);
    setLeadCrm(null);
  }

  function createMessage(
    sender: "user" | "assistant",
    text: string,
  ): ChatMessage {
    return {
      id: crypto.randomUUID(),
      sender,
      text,
      time: getCurrentTime(),
    };
  }

  async function requestCentralPricing(
  lead: OnlineBeraterLead,
): Promise<ChatCentralPricing | null> {

  const service =
    lead.service ??
    null;

  if (!service) {
    return null;
  }

  try {
    const response =
      await fetch(
        "/api/public/pricing",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            service,
            areaM2:
              lead.areaM2 ??
              null,
            rooms:
              lead.rooms ??
              null,
            bathrooms:
              lead.bathrooms ??
              null,
            windows:
              lead.windows ??
              null,
            condition:
              lead.condition ??
              null,
            frequency:
              lead.frequency ??
              null,
            extras:
              lead.extras,
            floor:
              lead.floor ??
              null,
            elevator:
              lead.elevator ??
              null,
            photoCount: 0,
          }),
        },
      );

    const payload =
      (await response
        .json()
        .catch(() => null)) as
        | ChatPricingApiResponse
        | null;

    if (
      !response.ok ||
      !payload?.success ||
      !payload.pricing
    ) {
      return null;
    }

    return payload.pricing;
  } catch {
    return null;
  }
}

async function requestOnlineBerater(
    nextMessages: ChatMessage[],
  ) {
    setIsThinking(true);
    setChatError(null);

    try {
      const response = await fetch(
        "/api/public/online-berater",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            messages:
              toApiMessages(
                nextMessages.slice(-24),
              ),
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as
        | OnlineBeraterApiResponse
        | null;

      if (
        !response.ok ||
        !payload?.success ||
        !payload.result
      ) {
        throw new Error(
          payload?.error ??
            "Der Online-Berater ist momentan nicht erreichbar.",
        );
      }

      const result = payload.result;

      const completeLead =
        mergeOnlineBeraterLead(
          session.lead,
          result.lead,
        );

      const pricing =
        await requestCentralPricing(
          completeLead,
        );

      setSession((current) =>
        createCompatibleSession(
          {
            ...result,
            lead: completeLead,
          },
          pricing,
          current,
        ),
      );

      setShouldAutoCreateLead(
        result.shouldCreateLead,
      );

      if (
        result.lead.customerName &&
        !leadName.trim()
      ) {
        setLeadName(
          result.lead.customerName,
        );
      }

      const detectedContact =
        result.lead.email ??
        result.lead.phone;

      if (
        detectedContact &&
        !leadContact.trim()
      ) {
        setLeadContact(detectedContact);
      }

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          result.reply,
        ),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Der Online-Berater ist momentan nicht erreichbar.";

      setChatError(message);

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "Entschuldigung, der Online-Berater konnte gerade keine Antwort erstellen. Bitte versuchen Sie es erneut.",
        ),
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSelectService(
    service: ServiceType,
  ) {
    if (isThinking) {
      return;
    }

    resetLeadSubmitState();
    setSelectedService(service);

    const userMessage = createMessage(
      "user",
      SERVICE_LABELS[service],
    );

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    void requestOnlineBerater(
      nextMessages,
    );
  }

  function handleSendMessage(
    text: string,
  ) {
    const message = text.trim();

    if (!message || isThinking) {
      return;
    }

    resetLeadSubmitState();

    const userMessage = createMessage(
      "user",
      message,
    );

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    void requestOnlineBerater(
      nextMessages,
    );
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
      const response =
        await fetchChatLead({
            name: name || null,
            contact,
            session,
            lead:
              session.lead,
            messages,
            pageUrl:
              typeof window !==
              "undefined"
                ? window.location.href
                : null,          });

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
      setShouldAutoCreateLead(false);
      setLeadStatus(
        payload.emailSent
          ? "success"
          : "partial",
      );
    } catch {
      setLeadStatus("error");
      setLeadError(
        "Die Anfrage konnte nicht best?tigt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie HEXA CLEAN direkt.",
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

            {chatError ? (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                {chatError}
              </p>
            ) : null}

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
                Der Online-Berater sammelt die
                noch benötigten Angaben. Danach
                können Sie die Anfrage direkt an
                HEXA CLEAN senden.
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
