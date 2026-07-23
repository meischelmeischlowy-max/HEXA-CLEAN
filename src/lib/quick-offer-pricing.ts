export type QuickOfferService =
  | "Unterhaltsreinigung"
  | "Grundreinigung"
  | "Umzugsreinigung"
  | "Hausreinigung"
  | "Buero"
  | "Fenster"
  | "Garten"
  | "Kleine Reparaturen";

export type QuickOfferCondition =
  | "LEICHT"
  | "NORMAL"
  | "STARK";

export type QuickOfferFrequency =
  | "EINMALIG"
  | "WOECHENTLICH"
  | "ZWEIWOECHENTLICH"
  | "MONATLICH";

export type QuickOfferPricingInput = {
  service: string;
  size: number;
  rooms: number;
  bathrooms: number;
  condition: string;
  frequency: string;
  selectedExtras: string[];
  photoCount: number;
};

export type QuickOfferPriceResult = {
  min: number;
  max: number;
  midpoint: number;
  requiresPhotoReview: boolean;
  confidence: "LOW" | "MEDIUM";
  explanation: string[];
};

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function roundToTen(value: number) {
  return Math.max(
    0,
    Math.round(value / 10) * 10,
  );
}

function normalizedService(
  value: string,
): QuickOfferService {
  const service = value
    .trim()
    .toLowerCase();

  if (
    service.includes("umzug") ||
    service.includes("abgabe")
  ) {
    return "Umzugsreinigung";
  }

  if (
    service.includes("grund") ||
    service === "wohnung"
  ) {
    return "Grundreinigung";
  }

  if (service.includes("unterhalt")) {
    return "Unterhaltsreinigung";
  }

  if (service.includes("haus")) {
    return "Hausreinigung";
  }

  if (
    service.includes("buero") ||
    service.includes("büro")
  ) {
    return "Buero";
  }

  if (service.includes("fenster")) {
    return "Fenster";
  }

  if (service.includes("garten")) {
    return "Garten";
  }

  return "Kleine Reparaturen";
}

function conditionMultiplier(
  value: string,
) {
  if (value === "LEICHT") {
    return 0.9;
  }

  if (value === "STARK") {
    return 1.35;
  }

  return 1;
}

function frequencyMultiplier(
  value: string,
) {
  if (value === "WOECHENTLICH") {
    return 0.88;
  }

  if (value === "ZWEIWOECHENTLICH") {
    return 0.92;
  }

  if (value === "MONATLICH") {
    return 0.96;
  }

  return 1;
}

function movingCleaningBase(
  rooms: number,
) {
  if (rooms <= 1.5) return 390;
  if (rooms <= 2.5) return 620;
  if (rooms <= 3.5) return 820;
  if (rooms <= 4.5) return 1050;
  if (rooms <= 5.5) return 1250;

  return 1250 +
    Math.ceil(rooms - 5.5) * 180;
}

export function calculateQuickOfferPrice(
  input: QuickOfferPricingInput,
): QuickOfferPriceResult {
  const service =
    normalizedService(input.service);

  const size = clamp(
    Number(input.size) || 80,
    20,
    1000,
  );

  const rooms = clamp(
    Number(input.rooms) || 3.5,
    1,
    12,
  );

  const bathrooms = clamp(
    Math.round(
      Number(input.bathrooms) || 1,
    ),
    1,
    8,
  );

  const extras = Array.isArray(
    input.selectedExtras,
  )
    ? input.selectedExtras
    : [];

  let base = 0;
  let lowerFactor = 0.9;
  let upperFactor = 1.18;

  const explanation: string[] = [];

  if (
    service ===
    "Unterhaltsreinigung"
  ) {
    const estimatedHours = Math.max(
      2,
      size / 35 +
        bathrooms * 0.45 +
        Math.max(rooms - 2, 0) * 0.15,
    );

    base =
      estimatedHours *
      46 *
      frequencyMultiplier(
        input.frequency,
      );

    lowerFactor = 0.9;
    upperFactor = 1.15;

    explanation.push(
      "Orientierung auf Basis eines professionellen Stundenansatzes von rund CHF 46.",
    );
  }

  if (
    service ===
    "Grundreinigung"
  ) {
    base =
      160 +
      size * 4.2 +
      bathrooms * 55 +
      Math.max(rooms - 2, 0) * 22;

    lowerFactor = 0.88;
    upperFactor = 1.22;

    explanation.push(
      "Grundreinigung berücksichtigt Fläche, Zimmer, Bäder und Zustand.",
    );
  }

  if (
    service ===
    "Umzugsreinigung"
  ) {
    base =
      movingCleaningBase(rooms) +
      Math.max(bathrooms - 1, 0) * 90;

    lowerFactor = 0.92;
    upperFactor = 1.18;

    explanation.push(
      "Umzugsreinigung orientiert sich primär an der Zimmerzahl und der Anzahl Bäder.",
    );
  }

  if (
    service ===
    "Hausreinigung"
  ) {
    base =
      220 +
      size * 4.6 +
      bathrooms * 60;

    lowerFactor = 0.88;
    upperFactor = 1.24;

    explanation.push(
      "Häuser benötigen meist mehr Laufwege und zusätzliche Flächen.",
    );
  }

  if (service === "Buero") {
    const estimatedHours = Math.max(
      2,
      size / 45,
    );

    base =
      estimatedHours *
      46 *
      frequencyMultiplier(
        input.frequency,
      );

    lowerFactor = 0.9;
    upperFactor = 1.18;

    explanation.push(
      "Büroreinigung wird aus Fläche, Rhythmus und geschätztem Zeitbedarf abgeleitet.",
    );
  }

  if (service === "Fenster") {
    base =
      130 +
      size * 1.2;

    lowerFactor = 0.85;
    upperFactor = 1.25;

    explanation.push(
      "Fensterpreis bleibt ohne genaue Anzahl und Zugänglichkeit bewusst breit.",
    );
  }

  if (service === "Garten") {
    base =
      Math.max(
        140,
        size * 1.6,
      );

    lowerFactor = 0.85;
    upperFactor = 1.3;

    explanation.push(
      "Gartenarbeiten hängen stark von Zustand, Entsorgung und Werkzeugbedarf ab.",
    );
  }

  if (
    service ===
    "Kleine Reparaturen"
  ) {
    base = 120;

    lowerFactor = 1;
    upperFactor = 2.2;

    explanation.push(
      "Kleinreparaturen benötigen eine Beschreibung oder Fotos für eine belastbare Offerte.",
    );
  }

  base *= conditionMultiplier(
    input.condition,
  );

  if (input.condition === "STARK") {
    explanation.push(
      "Starke Verschmutzung erhöht den geschätzten Arbeitsaufwand.",
    );
  }

  const extraPrices: Record<
    string,
    number
  > = {
    Fenster: 90,
    Backofen: 50,
    Kuehlschrank: 45,
    Kühlschrank: 45,
    Balkon: 55,
    Keller: 70,
    Garage: 90,
    Storen: 80,
  };

  const extrasTotal = extras.reduce(
    (sum, extra) =>
      sum +
      (extraPrices[extra] ?? 35),
    0,
  );

  base += extrasTotal;

  if (extras.length > 0) {
    explanation.push(
      `${extras.length} Zusatzleistung(en) berücksichtigt.`,
    );
  }

  const requiresPhotoReview =
    service === "Grundreinigung" ||
    service === "Umzugsreinigung" ||
    service === "Hausreinigung" ||
    service === "Garten" ||
    service === "Kleine Reparaturen";

  const hasPhotos =
    Number(input.photoCount) > 0;

  if (requiresPhotoReview && !hasPhotos) {
    upperFactor += 0.12;

    explanation.push(
      "Ohne Fotos bleibt die obere Preisgrenze breiter.",
    );
  }

  if (hasPhotos) {
    explanation.push(
      "Fotos werden vor der verbindlichen Offerte visuell durch HEXA CLEAN geprüft.",
    );
  }

  const min = roundToTen(
    base * lowerFactor,
  );

  const max = Math.max(
    min + 30,
    roundToTen(
      base * upperFactor,
    ),
  );

  return {
    min,
    max,
    midpoint: roundToTen(
      (min + max) / 2,
    ),
    requiresPhotoReview,
    confidence:
      hasPhotos
        ? "MEDIUM"
        : "LOW",
    explanation,
  };
}
