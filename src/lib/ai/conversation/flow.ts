import {
  AISession,
  ConversationStep,
  ServiceType,
} from "../types";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  reinigung: "Reinigung",
  fenster: "Fensterreinigung",
  hauswartung: "Hauswartung",
  umzug: "Umzugsreinigung",
  kleinreparaturen: "Kleinreparaturen",
};

export const SERVICE_START_QUESTION: Record<ServiceType, string> = {
  reinigung:
    "Gerne. Wie groß ist die zu reinigende Fläche ungefähr in Quadratmetern?",
  fenster:
    "Sehr gerne. Wie viele Fenster sollen ungefähr gereinigt werden?",
  hauswartung:
    "Gerne. Geht es um eine regelmäßige Hauswartung oder um einen einmaligen Einsatz?",
  umzug:
    "Gerne. Wie groß ist die Wohnung ungefähr in Quadratmetern?",
  kleinreparaturen:
    "Gerne. Beschreiben Sie bitte kurz, welche Reparatur benötigt wird.",
};

export const SERVICE_FIRST_STEP: Record<ServiceType, ConversationStep> = {
  reinigung: "area",
  fenster: "windows",
  hauswartung: "frequency",
  umzug: "area",
  kleinreparaturen: "description",
};

export function createInitialSession(): AISession {
  return {
    step: "start",
    answers: {},
    progress: 0,
    estimatedPrice: 0,
    priceRange: "Wird berechnet",
    completed: false,
  };
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function parseYesNo(value: string): boolean | undefined {
  const text = normalizeText(value);

  const yesWords = [
    "ja",
    "yes",
    "tak",
    "oui",
    "si",
    "klar",
    "gerne",
    "natürlich",
    "vorhanden",
    "gibt es",
    "mit",
    "bitte",
    "ok",
    "okay",
  ];

  const noWords = [
    "nein",
    "no",
    "nie",
    "nichts",
    "kein",
    "keine",
    "ohne",
    "nicht",
    "gibt es nicht",
  ];

  if (yesWords.some((word) => text === word || text.includes(word))) {
    return true;
  }

  if (noWords.some((word) => text === word || text.includes(word))) {
    return false;
  }

  return undefined;
}

export function getNextStep(session: AISession): ConversationStep {
  const service = session.answers.service;

  if (!service) return "service";

  if (service === "umzug") {
    if (!session.answers.area) return "area";
    if (!session.answers.windows) return "windows";
    if (!session.answers.floor) return "floor";
    if (session.answers.elevator === undefined) return "elevator";
    if (session.answers.oven === undefined) return "oven";
    if (session.answers.balcony === undefined) return "balcony";
    if (!session.answers.date) return "date";
    return "summary";
  }

  if (service === "reinigung") {
    if (!session.answers.area) return "area";
    if (!session.answers.date) return "date";
    return "summary";
  }

  if (service === "fenster") {
    if (!session.answers.windows) return "windows";
    if (!session.answers.floor) return "floor";
    if (session.answers.elevator === undefined) return "elevator";
    if (!session.answers.date) return "date";
    return "summary";
  }

  if (service === "hauswartung") {
    if (!session.answers.frequency) return "frequency";
    if (!session.answers.description) return "description";
    if (!session.answers.date) return "date";
    return "summary";
  }

  if (service === "kleinreparaturen") {
    if (!session.answers.description) return "description";
    if (!session.answers.date) return "date";
    return "summary";
  }

  return "summary";
}

export function getQuestionForStep(step: ConversationStep): string {
  switch (step) {
    case "service":
      return "Welche Dienstleistung benötigen Sie?";

    case "area":
      return "Wie groß ist die Fläche ungefähr in Quadratmetern?";

    case "windows":
      return "Wie viele Fenster sollen ungefähr gereinigt werden?";

    case "floor":
      return "In welcher Etage befindet sich die Wohnung oder das Objekt?";

    case "elevator":
      return "Gibt es einen Lift im Gebäude? Sie können einfach mit Ja oder Nein antworten.";

    case "oven":
      return "Soll der Backofen ebenfalls gereinigt werden?";

    case "balcony":
      return "Gibt es einen Balkon oder eine Terrasse?";

    case "frequency":
      return "Soll die Leistung einmalig oder regelmäßig erfolgen?";

    case "description":
      return "Bitte beschreiben Sie kurz, was genau benötigt wird.";

    case "date":
      return "Haben Sie einen gewünschten Termin?";

    case "summary":
      return "Vielen Dank. Ich habe die wichtigsten Angaben gesammelt und erstelle nun eine Zusammenfassung.";

    default:
      return "Wie können wir Ihnen helfen?";
  }
}

export function getProgressForStep(step: ConversationStep): number {
  switch (step) {
    case "start":
      return 0;

    case "service":
      return 10;

    case "area":
    case "windows":
    case "frequency":
    case "description":
      return 30;

    case "floor":
    case "elevator":
      return 50;

    case "oven":
    case "balcony":
      return 70;

    case "date":
      return 85;

    case "summary":
      return 100;

    default:
      return 0;
  }
}

export function isSummaryStep(step: ConversationStep): boolean {
  return step === "summary";
}

export function getSummaryIntro(): string {
  return "Danke. Hier ist eine erste unverbindliche Zusammenfassung Ihrer Anfrage:";
}

export function getFinalOfferText(): string {
  return "Wenn alles stimmt, können Sie die Anfrage jetzt senden. HEXA CLEAN meldet sich danach persönlich mit einer genauen Offerte.";
}