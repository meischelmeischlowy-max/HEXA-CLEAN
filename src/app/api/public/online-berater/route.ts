import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runOnlineBerater,
} from "@/lib/online-berater/engine";
import type {
  OnlineBeraterMessage,
  OnlineBeraterResult,
} from "@/lib/online-berater/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 50_000;
const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 2_000;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseMessages(
  value: unknown,
): OnlineBeraterMessage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_MESSAGES
  ) {
    return null;
  }

  const messages: OnlineBeraterMessage[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return null;
    }

    const role = entry.role;
    const content = entry.content;

    if (
      role !== "user" &&
      role !== "assistant"
    ) {
      return null;
    }

    if (
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > MAX_MESSAGE_LENGTH
    ) {
      return null;
    }

    messages.push({
      role,
      content: content.trim(),
    });
  }

  return messages;
}


type LocalFallbackLead = {
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

function localNumber(
  value: string | undefined,
) {
  if (!value) {
    return null;
  }

  const parsed = Number(
    value.replace(",", "."),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function buildLocalFallback(
  messages: OnlineBeraterMessage[],
) {
  const userText =
    messages
      .filter(
        (message) =>
          message.role === "user",
      )
      .map(
        (message) =>
          message.content,
      )
      .join("\n");

  const lastUserText =
    [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "user",
      )
      ?.content ?? "";

  const normalized =
    userText.toLocaleLowerCase(
      "de-CH",
    );

  const lead: LocalFallbackLead = {
    service: null,
    objectType: null,
    location: null,
    areaM2: null,
    rooms: null,
    bathrooms: null,
    windows: null,
    floor: null,
    elevator: null,
    parkingAccess: null,
    condition: null,
    frequency: null,
    extras: [],
    preferredDate: null,
    flexibleDate: null,
    photoRequired: null,
    customerName: null,
    email: null,
    phone: null,
  };

  const emailMatch =
    userText.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    );

  if (emailMatch) {
    lead.email =
      emailMatch[0].toLowerCase();
  }

  const phoneMatch =
    userText.match(
      /(?:\+|00)?\d[\d ()/.-]{6,}\d/,
    );

  if (phoneMatch) {
    const phone =
      phoneMatch[0]
        .replace(/[^\d+]/g, "")
        .replace(/^00/, "+");

    if (
      phone.replace(/\D/g, "")
        .length >= 7
    ) {
      lead.phone = phone;
    }
  }

  const areaMatch =
    userText.match(
      /(\d{2,4}(?:[.,]\d+)?)\s*(?:m2|m²|qm)\b/i,
    );

  lead.areaM2 =
    localNumber(
      areaMatch?.[1],
    );

  const roomsMatch =
    userText.match(
      /(\d+(?:[.,]5)?)\s*(?:zimmer|pokoj|pokoje|rooms?)\b/i,
    );

  lead.rooms =
    localNumber(
      roomsMatch?.[1],
    );

  const bathroomsMatch =
    userText.match(
      /(\d+)\s*(?:badezimmer|bäder|baeder|azienk\w*|lazienk\w*|bathrooms?)\b/i,
    );

  lead.bathrooms =
    localNumber(
      bathroomsMatch?.[1],
    );

  const windowsMatch =
    userText.match(
      /(\d{1,3})\s*(?:fenster|okna|windows?)\b/i,
    );

  lead.windows =
    localNumber(
      windowsMatch?.[1],
    );

  const floorMatch =
    userText.match(
      /(?:etage|stock|pi[e]tro|floor)\s*[:\-]?\s*(\d+)/i,
    );

  lead.floor =
    localNumber(
      floorMatch?.[1],
    );

  if (
    /\b(?:mit lift|mit aufzug|jest winda|winda jest|elevator yes)\b/i
      .test(userText)
  ) {
    lead.elevator = true;
  }

  if (
    /\b(?:ohne lift|ohne aufzug|bez windy|brak windy|elevator no)\b/i
      .test(userText)
  ) {
    lead.elevator = false;
  }

  if (
    /\b(?:umzugsreinigung|endreinigung|przeprowadzk)\w*\b/i
      .test(userText)
  ) {
    lead.service =
      "Umzugsreinigung";
  } else if (
    /\b(?:grundreinigung|gruntowne sprzatanie|general cleaning)\b/i
      .test(userText)
  ) {
    lead.service =
      "Grundreinigung";
  } else if (
    /\b(?:unterhaltsreinigung|regularne sprzatanie|regular cleaning)\b/i
      .test(userText)
  ) {
    lead.service =
      "Unterhaltsreinigung";
  } else if (
    /\b(?:fensterreinigung|mycie okien|window cleaning)\b/i
      .test(userText)
  ) {
    lead.service =
      "Fensterreinigung";
  } else if (
    /\b(?:kleinreparatur\w*|napraw\w*|repair)\b/i
      .test(userText)
  ) {
    lead.service =
      "Kleinreparaturen";
  } else if (
    /\b(?:reinigung|sprzatan\w*|cleaning)\b/i
      .test(userText)
  ) {
    lead.service =
      "Reinigung";
  }

  if (
    /\bwohnung\b/i.test(userText)
  ) {
    lead.objectType = "Wohnung";
  } else if (
    /\b(?:haus|dom)\b/i.test(userText)
  ) {
    lead.objectType = "Haus";
  } else if (
    /\b(?:büro|buero|biuro|office)\b/i
      .test(userText)
  ) {
    lead.objectType = "Büro";
  }

  if (
    /\b(?:stark|sehr schmutzig|mocno zabrudzon\w*)\b/i
      .test(userText)
  ) {
    lead.condition = "STARK";
  } else if (
    /\b(?:leicht|lekko zabrudzon\w*)\b/i
      .test(userText)
  ) {
    lead.condition = "LEICHT";
  } else if (
    /\b(?:normal|normalnie zabrudzon\w*)\b/i
      .test(userText)
  ) {
    lead.condition = "NORMAL";
  }

  if (
    /\b(?:wöchentlich|woechentlich|co tydzien|co tydzie|weekly)\b/i
      .test(userText)
  ) {
    lead.frequency =
      "WOECHENTLICH";
  } else if (
    /\b(?:alle zwei wochen|co dwa tygodnie|biweekly)\b/i
      .test(userText)
  ) {
    lead.frequency =
      "ZWEIWOECHENTLICH";
  } else if (
    /\b(?:monatlich|miesicznie|miesiecznie|monthly)\b/i
      .test(userText)
  ) {
    lead.frequency =
      "MONATLICH";
  } else if (
    /\b(?:einmalig|jednorazowo|one time)\b/i
      .test(userText)
  ) {
    lead.frequency =
      "EINMALIG";
  }

  const extras = [
    ["Fenster", /\b(?:fenster|okna|window)\w*\b/i],
    ["Balkon", /\b(?:balkon|balcony)\b/i],
    ["Backofen", /\b(?:backofen|piekarnik|oven)\b/i],
    ["Kühlschrank", /\b(?:kühlschrank|kuehlschrank|lodówka|lodowka|fridge)\b/i],
    ["Keller", /\b(?:keller|piwnica|basement)\b/i],
    ["Garage", /\b(?:garage|gara|garaz)\b/i],
    ["Storen", /\b(?:storen|rollladen|rolety|blinds)\b/i],
  ] as const;

  for (
    const [name, pattern]
    of extras
  ) {
    if (pattern.test(userText)) {
      lead.extras.push(name);
    }
  }

  const addressMatch =
    lastUserText.match(
      /[A-Za-zÀ-ž][A-Za-zÀ-ž .'-]{1,80}\s+\d+[A-Za-z]?(?:,\s*|\s+)\d{4,5}\s+[A-Za-zÀ-ž][A-Za-zÀ-ž .'-]{1,80}/,
    );

  if (addressMatch) {
    lead.location =
      addressMatch[0]
        .replace(/\s+/g, " ")
        .trim();
  } else {
    const zipCityMatch =
      lastUserText.match(
        /\b\d{4,5}\s+[A-Za-zÀ-ž][A-Za-zÀ-ž .'-]{2,80}/,
      );

    if (zipCityMatch) {
      lead.location =
        zipCityMatch[0]
          .replace(/\s+/g, " ")
          .trim();
    }
  }

  const nameMatch =
    userText.match(
      /(?:ich heiße|ich heisse|mein name ist|nazywam si|nazywam sie|my name is)\s+([A-Za-zÀ-ž][A-Za-zÀ-ž .'-]{1,80})/i,
    );

  if (nameMatch) {
    lead.customerName =
      nameMatch[1]
        .replace(/\s+/g, " ")
        .trim();
  }

  const dateMatch =
    userText.match(
      /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/,
    );

  if (dateMatch) {
    lead.preferredDate =
      dateMatch[1];
  } else if (
    /\b(?:flexibel|flexible|obojtnie|obojetnie)\b/i
      .test(userText)
  ) {
    lead.flexibleDate = true;
  }

  const missingFields: string[] = [];

  if (!lead.service) {
    missingFields.push("service");
  }

  if (!lead.location) {
    missingFields.push("location");
  }

  if (!lead.areaM2) {
    missingFields.push("areaM2");
  }

  if (!lead.customerName) {
    missingFields.push(
      "customerName",
    );
  }

  if (
    !lead.email &&
    !lead.phone
  ) {
    missingFields.push("contact");
  }

  const hasContact =
    Boolean(
      lead.email ||
      lead.phone,
    );

  const capturedDetails = [
    lead.service,
    lead.objectType,
    lead.location,
    lead.areaM2,
    lead.rooms,
    lead.bathrooms,
    lead.windows,
    lead.floor,
    lead.condition,
    lead.frequency,
    lead.preferredDate,
  ].filter(
    (value) =>
      value !== null &&
      value !== "",
  ).length;

  let reply =
    "Vielen Dank. Ich habe Ihre bisherigen Angaben gesichert.";

  if (!lead.service) {
    reply =
      "Welche Dienstleistung benötigen Sie genau, zum Beispiel Grundreinigung, Umzugsreinigung, Fensterreinigung oder Kleinreparaturen?";
  } else if (!lead.location) {
    reply =
      "Bitte nennen Sie die vollständige Einsatzadresse mit Strasse, Hausnummer, PLZ und Ort.";
  } else if (!lead.areaM2) {
    reply =
      "Wie gross ist das Objekt ungefähr in Quadratmetern?";
  } else if (!lead.customerName) {
    reply =
      "Wie lautet Ihr Vor- und Nachname?";
  } else if (!hasContact) {
    reply =
      "Unter welcher E-Mail-Adresse oder Telefonnummer dürfen wir Sie kontaktieren?";
  } else {
    reply =
      "Vielen Dank. Ihre Anfrage und alle bisher genannten Angaben werden jetzt sicher im CRM gespeichert. HEXA CLEAN prüft den Umfang persönlich und meldet sich bei Ihnen.";
  }

  return {
    reply,
    lead,
    missingFields,
    leadReady:
      hasContact &&
      missingFields.length === 0,
    shouldCreateLead:
      hasContact &&
      capturedDetails >= 1,
    shouldAskForPhotos:
      lead.condition === "STARK" ||
      lead.service ===
        "Umzugsreinigung",
    confidence:
      capturedDetails >= 7
        ? "HIGH"
        : capturedDetails >= 3
          ? "MEDIUM"
          : "LOW",
  } as const;
}

function mergeAiAndDeterministicResult(
  aiResult: OnlineBeraterResult,
  localResult: ReturnType<
    typeof buildLocalFallback
  >,
): OnlineBeraterResult {
  const lead = {
    service:
      aiResult.lead.service ??
      localResult.lead.service,
    objectType:
      aiResult.lead.objectType ??
      localResult.lead.objectType,
    location:
      aiResult.lead.location ??
      localResult.lead.location,
    areaM2:
      aiResult.lead.areaM2 ??
      localResult.lead.areaM2,
    rooms:
      aiResult.lead.rooms ??
      localResult.lead.rooms,
    bathrooms:
      aiResult.lead.bathrooms ??
      localResult.lead.bathrooms,
    windows:
      aiResult.lead.windows ??
      localResult.lead.windows,
    floor:
      aiResult.lead.floor ??
      localResult.lead.floor,
    elevator:
      aiResult.lead.elevator ??
      localResult.lead.elevator,
    parkingAccess:
      aiResult.lead.parkingAccess ??
      localResult.lead.parkingAccess,
    condition:
      aiResult.lead.condition ??
      localResult.lead.condition,
    frequency:
      aiResult.lead.frequency ??
      localResult.lead.frequency,
    extras: Array.from(
      new Set([
        ...localResult.lead.extras,
        ...aiResult.lead.extras,
      ]),
    ),
    preferredDate:
      aiResult.lead.preferredDate ??
      localResult.lead.preferredDate,
    flexibleDate:
      aiResult.lead.flexibleDate ??
      localResult.lead.flexibleDate,
    photoRequired:
      aiResult.lead.photoRequired ??
      localResult.lead.photoRequired,
    customerName:
      aiResult.lead.customerName ??
      localResult.lead.customerName,
    email:
      aiResult.lead.email ??
      localResult.lead.email,
    phone:
      aiResult.lead.phone ??
      localResult.lead.phone,
  };

  const hasContact =
    Boolean(
      lead.email ||
      lead.phone,
    );

  const requiredChecks = {
    service: Boolean(lead.service),
    objectType:
      Boolean(
        lead.objectType ||
        lead.areaM2 ||
        lead.rooms,
      ),
    location: Boolean(lead.location),
    areaM2:
      Boolean(
        lead.areaM2 ||
        lead.rooms,
      ),
    condition:
      Boolean(lead.condition),
    date:
      Boolean(
        lead.preferredDate ||
        lead.flexibleDate,
      ),
    contact: hasContact,
  };

  const missingFields =
    Object.entries(requiredChecks)
      .filter(([, present]) => !present)
      .map(([field]) => field);

  const leadReady =
    missingFields.length === 0;

  return {
    ...aiResult,
    lead,
    missingFields,
    leadReady,
    shouldCreateLead:
      leadReady &&
      hasContact,
  };
}

export async function POST(
  request: NextRequest,
) {
  const contentLength = Number(
    request.headers.get(
      "content-length",
    ) ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Die Nachricht ist zu groß.",
      },
      {
        status: 413,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let fallbackMessages:
    OnlineBeraterMessage[] = [];

  try {
    const body: unknown =
      await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Anfrage.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const messages =
      parseMessages(body.messages);

    if (!messages) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Gesprächsverlauf ist ungültig.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    fallbackMessages =
      messages;

    const aiResult =
      await runOnlineBerater({
        messages,
      });

    const localResult =
      buildLocalFallback(
        messages,
      );

    const result =
      mergeAiAndDeterministicResult(
        aiResult,
        localResult,
      );

    return NextResponse.json(
      {
        success: true,
        result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Online Berater API error:",
      error instanceof Error
        ? error.message
        : "Unknown error",
    );

    const result =
      buildLocalFallback(
        fallbackMessages,
      );

    return NextResponse.json(
      {
        success: true,
        result,
        fallback: true,
        degradedMode: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Hexa-Chat-Mode":
            "local-fallback",
        },
      },
    );
  }
}
