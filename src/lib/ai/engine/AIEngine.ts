import {
  AIEngineInput,
  AIEngineResult,
  AISession,
  ServiceType,
} from "../types";

import {
  getFinalOfferText,
  getNextStep,
  getProgressForStep,
  getQuestionForStep,
  getSummaryIntro,
  parseYesNo,
  SERVICE_FIRST_STEP,
  SERVICE_LABELS,
  SERVICE_START_QUESTION,
} from "../conversation/flow";

import { calculatePrice } from "../pricing/pricing";

function parseNumber(message: string): number | undefined {
  const match = message.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function hasAnswerForCurrentStep(session: AISession): boolean {
  const step = session.step;

  if (step === "area") return !!session.answers.area;
  if (step === "windows") return !!session.answers.windows;
  if (step === "floor") return !!session.answers.floor;
  if (step === "elevator") return session.answers.elevator !== undefined;
  if (step === "oven") return session.answers.oven !== undefined;
  if (step === "balcony") return session.answers.balcony !== undefined;
  if (step === "description") return !!session.answers.description;
  if (step === "frequency") return !!session.answers.frequency;
  if (step === "date") return !!session.answers.date;

  return true;
}

function getValidationReply(session: AISession): string {
  const step = session.step;

  if (step === "area") {
    return "Bitte geben Sie die Fläche ungefähr als Zahl an, zum Beispiel 120.";
  }

  if (step === "windows") {
    return "Bitte geben Sie die Anzahl der Fenster ungefähr als Zahl an, zum Beispiel 12.";
  }

  if (step === "elevator" || step === "oven" || step === "balcony") {
    return "Bitte antworten Sie kurz mit Ja oder Nein.";
  }

  if (step === "floor") {
    return "Bitte geben Sie die Etage an, zum Beispiel EG, 1. Etage oder 3. Etage.";
  }

  if (step === "description") {
    return "Bitte beschreiben Sie kurz, was genau benötigt wird.";
  }

  if (step === "frequency") {
    return "Bitte schreiben Sie kurz, ob es einmalig oder regelmäßig sein soll.";
  }

  if (step === "date") {
    return "Bitte nennen Sie einen gewünschten Termin oder schreiben Sie flexibel.";
  }

  return getQuestionForStep(step);
}

function updateAnswers(message: string, session: AISession): AISession {
  const step = session.step;

  const nextSession: AISession = {
    ...session,
    answers: {
      ...session.answers,
    },
  };

  if (step === "area") {
    const number = parseNumber(message);
    if (number && number > 0) {
      nextSession.answers.area = number;
    }
  }

  if (step === "windows") {
    const number = parseNumber(message);
    if (number && number >= 0) {
      nextSession.answers.windows = number;
    }
  }

  if (step === "floor") {
    const value = message.trim();
    if (value.length > 0) {
      nextSession.answers.floor = value;
    }
  }

  if (step === "elevator") {
    const value = parseYesNo(message);
    if (value !== undefined) {
      nextSession.answers.elevator = value;
    }
  }

  if (step === "oven") {
    const value = parseYesNo(message);
    if (value !== undefined) {
      nextSession.answers.oven = value;
    }
  }

  if (step === "balcony") {
    const value = parseYesNo(message);
    if (value !== undefined) {
      nextSession.answers.balcony = value;
    }
  }

  if (step === "description") {
    const value = message.trim();
    if (value.length > 2) {
      nextSession.answers.description = value;
    }
  }

  if (step === "frequency") {
    const value = message.trim();
    if (value.length > 0) {
      nextSession.answers.frequency = value;
    }
  }

  if (step === "date") {
    const value = message.trim();
    if (value.length > 0) {
      nextSession.answers.date = value;
    }
  }

  return nextSession;
}

function buildSummaryReply(session: AISession): string {
  const answers = session.answers;

  const lines: string[] = [];

  lines.push(getSummaryIntro());

  if (answers.serviceLabel) {
    lines.push(`Dienstleistung: ${answers.serviceLabel}`);
  }

  if (answers.area) {
    lines.push(`Fläche: ca. ${answers.area} m²`);
  }

  if (answers.windows !== undefined) {
    lines.push(`Fenster: ca. ${answers.windows}`);
  }

  if (answers.floor) {
    lines.push(`Etage: ${answers.floor}`);
  }

  if (answers.elevator !== undefined) {
    lines.push(`Lift: ${answers.elevator ? "Ja" : "Nein"}`);
  }

  if (answers.oven !== undefined) {
    lines.push(`Backofen: ${answers.oven ? "Ja" : "Nein"}`);
  }

  if (answers.balcony !== undefined) {
    lines.push(`Balkon/Terrasse: ${answers.balcony ? "Ja" : "Nein"}`);
  }

  if (answers.frequency) {
    lines.push(`Rhythmus: ${answers.frequency}`);
  }

  if (answers.description) {
    lines.push(`Beschreibung: ${answers.description}`);
  }

  if (answers.date) {
    lines.push(`Wunschtermin: ${answers.date}`);
  }

  lines.push(`Geschätzter Preis: ${session.priceRange}`);
  lines.push(getFinalOfferText());

  return lines.join("\n");
}

export function selectService(
  service: ServiceType,
  session: AISession
): AIEngineResult {
  const step = SERVICE_FIRST_STEP[service];

  const nextSession: AISession = {
    ...session,
    step,
    answers: {
      ...session.answers,
      service,
      serviceLabel: SERVICE_LABELS[service],
    },
    progress: getProgressForStep(step),
    completed: false,
  };

  const price = calculatePrice(nextSession);

  nextSession.estimatedPrice = price.estimatedPrice;
  nextSession.priceRange = price.priceRange;

  return {
    reply: SERVICE_START_QUESTION[service],
    session: nextSession,
  };
}

export function processMessage({
  message,
  session,
}: AIEngineInput): AIEngineResult {
  const updatedSession = updateAnswers(message, session);

  if (!hasAnswerForCurrentStep(updatedSession)) {
    return {
      reply: getValidationReply(session),
      session,
    };
  }

  const nextStep = getNextStep(updatedSession);

  const price = calculatePrice(updatedSession);

  const finalSession: AISession = {
    ...updatedSession,
    step: nextStep,
    progress: getProgressForStep(nextStep),
    estimatedPrice: price.estimatedPrice,
    priceRange: price.priceRange,
    completed: nextStep === "summary",
  };

  return {
    reply:
      nextStep === "summary"
        ? buildSummaryReply(finalSession)
        : getQuestionForStep(nextStep),
    session: finalSession,
  };
}