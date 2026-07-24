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

function playWitchLaugh() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass =
    window.AudioContext;

  if (!AudioContextClass) {
    return;
  }

  try {
    const context =
      new AudioContextClass();

    const notes = [
      {
        time: 0,
        frequency: 420,
        duration: 0.11,
      },
      {
        time: 0.12,
        frequency: 540,
        duration: 0.1,
      },
      {
        time: 0.27,
        frequency: 470,
        duration: 0.12,
      },
      {
        time: 0.43,
        frequency: 620,
        duration: 0.11,
      },
      {
        time: 0.6,
        frequency: 510,
        duration: 0.15,
      },
    ];

    for (const note of notes) {
      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type =
        "triangle";
      oscillator.frequency.setValueAtTime(
        note.frequency,
        context.currentTime +
          note.time,
      );

      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime +
          note.time,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.04,
        context.currentTime +
          note.time +
          0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime +
          note.time +
          note.duration,
      );

      oscillator.connect(gain);
      gain.connect(
        context.destination,
      );

      oscillator.start(
        context.currentTime +
          note.time,
      );
      oscillator.stop(
        context.currentTime +
          note.time +
          note.duration,
      );
    }

    window.setTimeout(() => {
      void context.close();
    }, 1400);
  } catch {
    // ignore
  }
}

function WitchIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative h-16 w-24 select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 90"
        className="h-full w-full overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient
            id="witchGlow"
            x1="0"
            x2="1"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#6ee7f9"
            />
            <stop
              offset="100%"
              stopColor="#7c3aed"
            />
          </linearGradient>
        </defs>

        <ellipse
          cx="48"
          cy="28"
          rx="10"
          ry="10"
          fill="#08111d"
          stroke="url(#witchGlow)"
          strokeWidth="2"
        />
        <path
          d="M41 22 L51 6 L60 22 Z"
          fill="#0b1320"
          stroke="url(#witchGlow)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M33 39 C43 28 61 28 70 39 L78 47 L58 50 L36 48 Z"
          fill="#08111d"
          stroke="url(#witchGlow)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M70 43 L106 52"
          stroke="#6ee7f9"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M106 52 L128 46 L128 58 Z"
          fill="#d97706"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M83 45 L75 59"
          stroke="#6ee7f9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M61 45 L56 57"
          stroke="#6ee7f9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="52"
          cy="29"
          r="1.7"
          fill="#6ee7f9"
        />
        <path
          d="M44 33 C47 36 52 37 56 34"
          stroke="#6ee7f9"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M23 34 C14 37 11 44 17 49 C26 46 30 40 23 34 Z"
          fill="#7c3aed"
          opacity="0.7"
        />
      </svg>
    </div>
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

  const [
    displayPrice,
    setDisplayPrice,
  ] = useState(0);

  const [
    displayPriceRange,
    setDisplayPriceRange,
  ] = useState(
    EMPTY_SESSION.priceRange,
  );

  const [
    isPriceSweeping,
    setIsPriceSweeping,
  ] = useState(false);

  const [
    laughEnabled,
    setLaughEnabled,
  ] = useState(true);

  const [
    laughBurstVisible,
    setLaughBurstVisible,
  ] = useState(false);

  const chatContainerRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const displayedPriceRef =
    useRef(0);

  useEffect(() => {
    displayedPriceRef.current =
      displayPrice;
  }, [displayPrice]);

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

  function presentPrice(
    nextPrice: number,
    nextPriceRange: string,
  ) {
    const previousPrice =
      displayedPriceRef.current;

    if (
      previousPrice === 0 ||
      nextPrice === 0
    ) {
      setDisplayPrice(
        nextPrice,
      );
      setDisplayPriceRange(
        nextPriceRange,
      );
      return;
    }

    if (
      nextPrice ===
        previousPrice &&
      nextPriceRange ===
        displayPriceRange
    ) {
      return;
    }

    setIsPriceSweeping(true);

    if (
      nextPrice >
        previousPrice &&
      laughEnabled
    ) {
      setLaughBurstVisible(
        true,
      );
      playWitchLaugh();

      window.setTimeout(() => {
        setLaughBurstVisible(
          false,
        );
      }, 1200);
    }

    window.setTimeout(() => {
      setDisplayPrice(
        nextPrice,
      );
      setDisplayPriceRange(
        nextPriceRange,
      );
    }, 520);

    window.setTimeout(() => {
      setIsPriceSweeping(
        false,
      );
    }, 1200);
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

      const nextSession =
        createSession(
          completeLead,
          pricing,
        );

      setSession(nextSession);

      if (
        nextSession.estimatedPrice >
        0
      ) {
        presentPrice(
          nextSession.estimatedPrice,
          nextSession.priceRange,
        );
      } else {
        setDisplayPrice(0);
        setDisplayPriceRange(
          nextSession.priceRange,
        );
      }

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
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#020711] text-white"
    >
      <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
        <div className="witch-orbit">
          <div className="witch-float">
            <WitchIcon className="drop-shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
          </div>
        </div>
      </div>

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

          <div className="shrink-0 border-t border-white/10 bg-[#050b16] px-3 py-3 sm:px-4">
            {chatError ? (
              <p className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                {chatError}
              </p>
            ) : null}

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Persönliche Offerte
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setLaughEnabled(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  className="rounded-full border border-cyan-300/30 bg-white/5 px-3 py-1 text-[11px] font-semibold text-cyan-100 transition hover:bg-white/10"
                >
                  {laughEnabled
                    ? "🔊 Hexenlachen"
                    : "🔇 Stumm"}
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-300">
                Die angezeigte Preisspanne ist eine unverbindliche Orientierung. Für eine genaue Offerte übermitteln Sie den vollständigen Umfang, Ihre Kontaktdaten und bei Bedarf Fotos über unsere Schnelle Offerte.
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

        <div className="relative hidden min-h-0 overflow-y-auto bg-[#050b16] p-4 lg:block">
          {laughBurstVisible ? (
            <div className="laugh-burst pointer-events-none absolute right-4 top-3 z-30 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-xs font-bold text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.35)]">
              Hihihi!
            </div>
          ) : null}

          <div
            className={`relative transition duration-300 ${
              isPriceSweeping
                ? "price-panel-glow"
                : ""
            }`}
          >
            {isPriceSweeping ? (
              <div className="pointer-events-none absolute left-0 right-0 top-36 z-20">
                <div className="price-sweep flex justify-start">
                  <WitchIcon className="scale-90 drop-shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
                </div>
              </div>
            ) : null}

            <ProgressPanelCompact
              progress={{
                service:
                  session.answers
                    .service,
                serviceLabel:
                  session.answers
                    .serviceLabel,
                area:
                  session.answers
                    .area,
                windows:
                  session.answers
                    .windows,
                floor:
                  session.answers
                    .floor,
                elevator:
                  session.answers
                    .elevator,
                date:
                  session.answers
                    .date,
                estimatedPrice:
                  displayPrice,
                priceRange:
                  displayPriceRange,
                progress:
                  session.progress,
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        .witch-orbit {
          position: absolute;
          inset: 10px;
        }

        .witch-float {
          animation: witchOrbit 16s linear infinite,
            witchBob 2.6s ease-in-out infinite;
          position: absolute;
          top: 0;
          left: 0;
        }

        .price-sweep {
          animation: priceSweep 1.15s ease-in-out both;
        }

        .price-panel-glow {
          animation: priceGlow 1.15s ease-in-out;
        }

        .laugh-burst {
          animation: laughPop 1.15s ease-out both;
        }

        @keyframes witchOrbit {
          0% {
            left: 12px;
            top: 12px;
            transform: rotate(-3deg);
          }
          24% {
            left: calc(100% - 96px);
            top: 12px;
            transform: rotate(6deg);
          }
          49% {
            left: calc(100% - 96px);
            top: calc(100% - 76px);
            transform: rotate(2deg);
          }
          74% {
            left: 12px;
            top: calc(100% - 76px);
            transform: rotate(-7deg);
          }
          100% {
            left: 12px;
            top: 12px;
            transform: rotate(-3deg);
          }
        }

        @keyframes witchBob {
          0%,
          100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -8px;
          }
        }

        @keyframes priceSweep {
          0% {
            transform: translateX(-120px) translateY(0) rotate(-6deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translateX(110px) translateY(-5px) rotate(3deg);
            opacity: 1;
          }
          100% {
            transform: translateX(235px) translateY(1px) rotate(10deg);
            opacity: 0;
          }
        }

        @keyframes priceGlow {
          0%,
          100% {
            filter: drop-shadow(0 0 0 rgba(34, 211, 238, 0));
          }
          45% {
            filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.35));
          }
        }

        @keyframes laughPop {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          85% {
            opacity: 1;
            transform: translateY(-4px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(0.96);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .witch-float,
          .price-sweep,
          .price-panel-glow,
          .laugh-burst {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
