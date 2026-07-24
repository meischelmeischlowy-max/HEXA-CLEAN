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
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(
      "Hihihihihihi!",
    );

    utterance.lang = "de-DE";
    utterance.rate = 0.78;
    utterance.pitch = 1.55;
    utterance.volume = 0.9;

    const voices =
      window.speechSynthesis.getVoices();

    const germanVoices = voices.filter(
      (voice) =>
        voice.lang
          .toLocaleLowerCase("de-CH")
          .startsWith("de"),
    );

    const preferredVoice =
      germanVoices.find((voice) =>
        /katja|anna|hedda|helena|female|weiblich|natural/i.test(
          voice.name,
        ),
      ) ??
      germanVoices[0] ??
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Brak dwiku nie moe zatrzyma rozmowy.
  }
}

function WitchIcon({
  className = "",
  pose = "flying",
}: {
  className?: string;
  pose?: "flying" | "sweeping";
}) {
  const isSweeping = pose === "sweeping";

  return (
    <div
      className={`relative select-none ${
        isSweeping
          ? "h-36 w-36"
          : "h-28 w-48"
      } ${className}`}
      style={{
        animationDuration: isSweeping
          ? "2.8s"
          : "28s",
        transitionDuration: "2800ms",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 360 220"
        className="h-full w-full overflow-visible drop-shadow-[0_12px_18px_rgba(124,58,237,0.45)]"
        fill="none"
      >
        <defs>
          <linearGradient
            id="witchDress"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#31205f"
            />
            <stop
              offset="55%"
              stopColor="#5b21b6"
            />
            <stop
              offset="100%"
              stopColor="#17112f"
            />
          </linearGradient>

          <linearGradient
            id="witchHat"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#7038c8"
            />
            <stop
              offset="100%"
              stopColor="#21133f"
            />
          </linearGradient>

          <linearGradient
            id="witchBroom"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              offset="0%"
              stopColor="#6b3c1c"
            />
            <stop
              offset="100%"
              stopColor="#d18b3c"
            />
          </linearGradient>

          <radialGradient id="witchSkin">
            <stop
              offset="0%"
              stopColor="#f5c79d"
            />
            <stop
              offset="100%"
              stopColor="#c98058"
            />
          </radialGradient>

          <filter
            id="witchGlow"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur
              stdDeviation="5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {isSweeping ? (
          <g>
            <ellipse
              cx="185"
              cy="202"
              rx="76"
              ry="10"
              fill="#0f172a"
              opacity="0.35"
            />

            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-5 205 150;7 205 150;-5 205 150"
                dur="0.75s"
                repeatCount="indefinite"
              />

              <path
                d="M198 90 L294 202"
                stroke="url(#witchBroom)"
                strokeWidth="10"
                strokeLinecap="round"
              />

              <path
                d="M274 178 C309 168 337 178 352 203 C324 216 293 214 278 200 Z"
                fill="#bb772d"
                stroke="#efb255"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              <path
                d="M286 183 L343 204 M295 178 L349 197 M281 191 L332 212"
                stroke="#704019"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            <path
              d="M130 103 C112 129 105 166 111 196 L209 196 C214 160 207 126 187 103 Z"
              fill="url(#witchDress)"
              stroke="#9f7aea"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M116 192 C135 179 155 185 164 198 C144 207 125 207 109 200 Z"
              fill="#19122f"
              stroke="#6d4ab0"
              strokeWidth="3"
            />

            <path
              d="M163 192 C184 178 205 186 215 199 C194 208 174 207 157 201 Z"
              fill="#19122f"
              stroke="#6d4ab0"
              strokeWidth="3"
            />

            <path
              d="M155 111 C174 126 186 142 198 159"
              stroke="#4c1d95"
              strokeWidth="14"
              strokeLinecap="round"
            />

            <circle
              cx="201"
              cy="161"
              r="8"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="2"
            />

            <path
              d="M118 113 C135 129 146 142 153 158"
              stroke="#4c1d95"
              strokeWidth="14"
              strokeLinecap="round"
            />

            <circle
              cx="155"
              cy="161"
              r="8"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="2"
            />

            <path
              d="M123 74 C103 75 94 91 101 111 C108 127 128 133 143 123 C132 111 126 92 123 74 Z"
              fill="#c9cad2"
              stroke="#57526c"
              strokeWidth="3"
            />

            <path
              d="M188 74 C211 79 217 98 208 115 C201 128 183 131 169 121 C180 107 185 91 188 74 Z"
              fill="#c9cad2"
              stroke="#57526c"
              strokeWidth="3"
            />

            <ellipse
              cx="156"
              cy="79"
              rx="42"
              ry="38"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="4"
            />

            <path
              d="M177 74 C203 72 217 79 224 89 C205 97 189 94 175 87 Z"
              fill="#d49a72"
              stroke="#7c402d"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            <ellipse
              cx="143"
              cy="74"
              rx="7"
              ry="9"
              fill="#fff9e8"
            />

            <circle
              cx="145"
              cy="76"
              r="3.5"
              fill="#21132f"
            />

            <ellipse
              cx="168"
              cy="72"
              rx="7"
              ry="9"
              fill="#fff9e8"
            />

            <circle
              cx="170"
              cy="74"
              r="3.5"
              fill="#21132f"
            />

            <path
              d="M144 96 C154 105 168 103 176 94"
              stroke="#6f2c2c"
              strokeWidth="4"
              strokeLinecap="round"
            />

            <path
              d="M125 49 C134 23 161 11 188 26 C205 36 211 52 210 64 C180 58 151 58 117 65 Z"
              fill="url(#witchHat)"
              stroke="#b28aff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M152 31 C163 4 185 -8 205 3 C191 14 195 27 210 37 C190 38 171 35 152 31 Z"
              fill="url(#witchHat)"
              stroke="#b28aff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M109 58 C137 49 186 50 222 65 C197 77 144 76 108 66 Z"
              fill="#24133f"
              stroke="#b28aff"
              strokeWidth="4"
            />

            <rect
              x="166"
              y="45"
              width="23"
              height="16"
              rx="3"
              fill="#e9a83d"
              stroke="#7b4814"
              strokeWidth="3"
            />

            <path
              d="M293 194 C306 186 318 187 326 193"
              stroke="#fbbf24"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.85"
            />

            <circle
              cx="329"
              cy="183"
              r="4"
              fill="#fbbf24"
            />

            <circle
              cx="344"
              cy="193"
              r="3"
              fill="#c084fc"
            />
          </g>
        ) : (
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 2;0 -5;0 2"
              dur="3.8s"
              repeatCount="indefinite"
            />

            <path
              d="M18 151 C74 143 170 140 330 145"
              stroke="url(#witchBroom)"
              strokeWidth="11"
              strokeLinecap="round"
            />

            <path
              d="M14 135 C35 132 56 139 76 151 C54 166 30 171 4 163 C16 153 17 144 14 135 Z"
              fill="#bd782e"
              stroke="#f0b45b"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M8 142 L65 154 M5 151 L61 160 M15 134 L73 148"
              stroke="#704019"
              strokeWidth="3"
              strokeLinecap="round"
            />

            <path
              d="M132 91 C111 105 104 132 119 157 C148 169 191 168 220 152 C216 125 200 101 180 89 Z"
              fill="url(#witchDress)"
              stroke="#a98aff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M119 150 C146 141 186 143 219 153 C196 169 150 174 118 159 Z"
              fill="#1c1335"
              stroke="#704bb1"
              strokeWidth="3"
            />

            <path
              d="M187 107 C207 117 226 129 242 142"
              stroke="#4c1d95"
              strokeWidth="14"
              strokeLinecap="round"
            />

            <circle
              cx="246"
              cy="145"
              r="8"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="2"
            />

            <path
              d="M137 108 C151 120 166 132 179 143"
              stroke="#4c1d95"
              strokeWidth="14"
              strokeLinecap="round"
            />

            <circle
              cx="182"
              cy="145"
              r="8"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="2"
            />

            <path
              d="M191 152 C208 163 223 174 240 180"
              stroke="#382354"
              strokeWidth="12"
              strokeLinecap="round"
            />

            <path
              d="M232 176 C248 173 259 180 264 190 C247 195 233 192 224 185 Z"
              fill="#171126"
              stroke="#7452a4"
              strokeWidth="3"
            />

            <path
              d="M137 151 C126 165 117 178 106 190"
              stroke="#382354"
              strokeWidth="12"
              strokeLinecap="round"
            />

            <path
              d="M91 186 C106 180 121 184 128 194 C111 201 96 199 85 193 Z"
              fill="#171126"
              stroke="#7452a4"
              strokeWidth="3"
            />

            <path
              d="M127 70 C105 72 96 89 104 108 C113 125 134 128 148 117 C136 104 131 87 127 70 Z"
              fill="#c9cad2"
              stroke="#57526c"
              strokeWidth="3"
            />

            <path
              d="M195 69 C217 74 223 93 214 109 C206 123 187 126 173 116 C186 102 191 86 195 69 Z"
              fill="#c9cad2"
              stroke="#57526c"
              strokeWidth="3"
            />

            <ellipse
              cx="161"
              cy="75"
              rx="43"
              ry="38"
              fill="url(#witchSkin)"
              stroke="#7c402d"
              strokeWidth="4"
            />

            <path
              d="M181 70 C211 67 229 76 240 87 C215 98 197 94 179 85 Z"
              fill="#d49a72"
              stroke="#7c402d"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            <ellipse
              cx="147"
              cy="69"
              rx="7"
              ry="9"
              fill="#fff9e8"
            />

            <circle
              cx="149"
              cy="71"
              r="3.5"
              fill="#21132f"
            />

            <ellipse
              cx="173"
              cy="68"
              rx="7"
              ry="9"
              fill="#fff9e8"
            />

            <circle
              cx="175"
              cy="70"
              r="3.5"
              fill="#21132f"
            />

            <path
              d="M148 92 C159 102 173 100 181 90"
              stroke="#6f2c2c"
              strokeWidth="4"
              strokeLinecap="round"
            />

            <path
              d="M129 44 C139 18 165 6 193 20 C210 29 218 46 216 58 C185 52 155 53 121 60 Z"
              fill="url(#witchHat)"
              stroke="#b28aff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M158 25 C170 -2 192 -13 214 -2 C198 9 202 23 219 33 C198 35 177 31 158 25 Z"
              fill="url(#witchHat)"
              stroke="#b28aff"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M112 53 C143 44 194 45 230 59 C204 72 149 72 110 62 Z"
              fill="#24133f"
              stroke="#b28aff"
              strokeWidth="4"
            />

            <rect
              x="175"
              y="39"
              width="23"
              height="16"
              rx="3"
              fill="#e9a83d"
              stroke="#7b4814"
              strokeWidth="3"
            />

            <path
              d="M48 124 C34 113 30 100 39 91"
              stroke="#a855f7"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.65"
              filter="url(#witchGlow)"
            />

            <circle
              cx="43"
              cy="82"
              r="4"
              fill="#fbbf24"
            />

            <circle
              cx="73"
              cy="111"
              r="3"
              fill="#67e8f9"
            />

            <circle
              cx="92"
              cy="88"
              r="4"
              fill="#c084fc"
            />
          </g>
        )}
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

    if (nextPrice === 0) {
      setDisplayPrice(0);
      setDisplayPriceRange(nextPriceRange);
      return;
    }

    if (
      nextPrice === previousPrice &&
      nextPriceRange === displayPriceRange
    ) {
      return;
    }

    const priceIncreased =
      nextPrice > previousPrice;

    if (!priceIncreased) {
      setDisplayPrice(nextPrice);
      setDisplayPriceRange(nextPriceRange);
      return;
    }

    setIsPriceSweeping(true);

    if (laughEnabled) {
      setLaughBurstVisible(true);
      playWitchLaugh();

      window.setTimeout(() => {
        setLaughBurstVisible(false);
      }, 2600);
    }

    window.setTimeout(() => {
      setDisplayPrice(nextPrice);
      setDisplayPriceRange(nextPriceRange);
    }, 1050);

    window.setTimeout(() => {
      setIsPriceSweeping(false);
    }, 2800);
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
            <WitchIcon pose="flying" className="drop-shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
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
                  <WitchIcon pose="sweeping" className="scale-90 drop-shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
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
