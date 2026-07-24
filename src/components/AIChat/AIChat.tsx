"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import ProgressPanelCompact from "./ProgressPanelCompact";
import {
  ChatMessage,
  ServiceType,
  START_MESSAGES,
} from "./types";

type OnlineBeraterLead = {
  service: string | null;
  objectType: string | null;
  location: string | null;
  areaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  windows: number | null;
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
  confidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";
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
    description?: string;
    date?: string;
  };
  progress: number;
  estimatedPrice: number;
  priceRange: string;
};

const EMPTY_SESSION: CompatibleChatSession = {
  lead: null,
  answers: {},
  progress: 0,
  estimatedPrice: 0,
  priceRange:
    "Preis wird nach Ihren Angaben berechnet",
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

function mapServiceType(
  service: string | null,
): ServiceType | undefined {
  const normalized =
    service
      ?.toLocaleLowerCase(
        "de-CH",
      ) ?? "";

  if (
    normalized.includes("umzug") ||
    normalized.includes("abgabe")
  ) {
    return "umzug";
  }

  if (
    normalized.includes("fenster")
  ) {
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

function mergeLead(
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
    customerName: null,
    email: null,
    phone: null,
  };
}

function calculateProgress(
  lead: OnlineBeraterLead,
) {
  const checks = [
    Boolean(lead.service),
    Boolean(
      lead.areaM2 ||
      lead.rooms,
    ),
    Boolean(lead.location),
    Boolean(lead.condition),
    Boolean(lead.frequency),
    Boolean(
      lead.preferredDate ||
      lead.flexibleDate,
    ),
  ];

  const completed =
    checks.filter(Boolean).length;

  return Math.round(
    (
      completed /
      checks.length
    ) * 100,
  );
}

function buildDescription(
  lead: OnlineBeraterLead,
) {
  return [
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
    lead.windows !== null
      ? `Fenster: ${lead.windows}`
      : null,
    lead.condition
      ? `Zustand: ${lead.condition}`
      : null,
    lead.frequency
      ? `Rhythmus: ${lead.frequency}`
      : null,
    lead.extras.length > 0
      ? `Zusatzleistungen: ${lead.extras.join(", ")}`
      : null,
  ]
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    )
    .join("\n");
}

function createSession(
  lead: OnlineBeraterLead,
  pricing: ChatCentralPricing | null,
): CompatibleChatSession {
  const serviceType =
    mapServiceType(
      lead.service,
    );

  const date =
    lead.preferredDate ??
    (
      lead.flexibleDate === true
        ? "Flexibel"
        : undefined
    );

  return {
    lead,
    answers: {
      service:
        serviceType,
      serviceLabel:
        lead.service ??
        (
          serviceType
            ? SERVICE_LABELS[
                serviceType
              ]
            : undefined
        ),
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
          ? String(lead.floor)
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
      description:
        buildDescription(
          lead,
        ) || undefined,
      date,
    },
    progress:
      calculateProgress(
        lead,
      ),
    estimatedPrice:
      pricing?.estimatedPrice ?? 0,
    priceRange:
      pricing?.priceRange ??
      "Preis wird nach Ihren Angaben berechnet",
  };
}

function toApiMessages(
  messages: ChatMessage[],
) {
  return messages.map(
    (message) => ({
      role:
        message.sender === "user"
          ? ("user" as const)
          : ("assistant" as const),
      content:
        message.text,
    }),
  );
}

export default function AIChat() {
  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>(
    START_MESSAGES,
  );

  const [
    session,
    setSession,
  ] = useState<
    CompatibleChatSession
  >(EMPTY_SESSION);

  const [
    isThinking,
    setIsThinking,
  ] = useState(false);

  const [
    chatError,
    setChatError,
  ] = useState<
    string | null
  >(null);

  const chatContainerRef =
    useRef<
      HTMLDivElement | null
    >(null);

  useEffect(() => {
    const element =
      chatContainerRef.current;

    if (!element) {
      return;
    }

    element.scrollTop =
      element.scrollHeight;
  }, [
    messages,
    isThinking,
  ]);

  function createMessage(
    sender:
      | "user"
      | "assistant",
    text: string,
  ): ChatMessage {
    return {
      id:
        crypto.randomUUID(),
      sender,
      text,
      time:
        getCurrentTime(),
    };
  }

  async function requestPricing(
    lead: OnlineBeraterLead,
  ): Promise<
    ChatCentralPricing | null
  > {
    if (!lead.service) {
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
            body:
              JSON.stringify({
                service:
                  lead.service,
                areaM2:
                  lead.areaM2,
                rooms:
                  lead.rooms,
                bathrooms:
                  lead.bathrooms,
                windows:
                  lead.windows,
                condition:
                  lead.condition,
                frequency:
                  lead.frequency,
                extras:
                  lead.extras,
                floor:
                  lead.floor,
                elevator:
                  lead.elevator,
                photoCount: 0,
              }),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as
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
    nextMessages:
      ChatMessage[],
  ) {
    setIsThinking(true);
    setChatError(null);

    try {
      const response =
        await fetch(
          "/api/public/online-berater",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                messages:
                  toApiMessages(
                    nextMessages.slice(
                      -24,
                    ),
                  ),
              }),
          },
        );

      const payload =
        (await response
          .json()
          .catch(
            () => null,
          )) as
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

      const result =
        payload.result;

      const completeLead =
        mergeLead(
          session.lead,
          result.lead,
        );

      const pricing =
        await requestPricing(
          completeLead,
        );

      setSession(
        createSession(
          completeLead,
          pricing,
        ),
      );

      setMessages(
        (current) => [
          ...current,
          createMessage(
            "assistant",
            result.reply,
          ),
        ],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Der Online-Berater ist momentan nicht erreichbar.";

      setChatError(message);

      setMessages(
        (current) => [
          ...current,
          createMessage(
            "assistant",
            "Entschuldigung, die Preisberatung ist momentan nicht erreichbar. Für eine persönliche Offerte nutzen Sie bitte unsere Schnelle Offerte.",
          ),
        ],
      );
    } finally {
      setIsThinking(false);
    }
  }

  function handleSendMessage(
    text: string,
  ) {
    const message =
      text.trim();

    if (
      !message ||
      isThinking
    ) {
      return;
    }

    const userMessage =
      createMessage(
        "user",
        message,
      );

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(
      nextMessages,
    );

    void requestOnlineBerater(
      nextMessages,
    );
  }

  return (
    <section
      id="ai-chat"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#020711] text-white"
    >
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col border-white/10 lg:border-r">
          <ChatHeader />

          <div
            ref={
              chatContainerRef
            }
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <ChatMessages
              messages={
                messages
              }
              isThinking={
                isThinking
              }
            />
          </div>

          <div className="max-h-[46vh] shrink-0 overflow-y-auto border-t border-white/10 bg-[#050b16] px-3 py-3 sm:px-4">
            {chatError ? (
              <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                {chatError}
              </p>
            ) : null}

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Persönliche Offerte
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-300">
                Die angezeigte Preisspanne ist eine unverbindliche Orientierung. Für eine genaue Offerte übermitteln Sie den vollständigen Umfang, Ihre Kontaktdaten und bei Bedarf Fotos ?ber unsere Schnelle Offerte.
              </p>

              <Link
                href="/#quick-offer"
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Schnelle Offerte öffnen
              </Link>
            </div>
          </div>

          <ChatInput
            onSendMessage={
              handleSendMessage
            }
            disabled={
              isThinking
            }
          />
        </div>

        <div className="hidden min-h-0 overflow-y-auto bg-[#050b16] p-4 lg:block">
          <ProgressPanelCompact
            progress={{
              service:
                session.answers.service,
              serviceLabel:
                session.answers.serviceLabel,
              area:
                session.answers.area,
              windows:
                session.answers.windows,
              floor:
                session.answers.floor,
              elevator:
                session.answers.elevator,
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
