import { AISession } from "../types";

export function calculatePrice(session: AISession) {
  const service = session.answers.service;

  if (!service) {
    return {
      estimatedPrice: 0,
      priceRange: "Wird berechnet",
    };
  }

  let price = 0;

  if (service === "umzug") {
    price = 280;

    if (session.answers.area) {
      price += session.answers.area * 1.8;
    }

    if (session.answers.windows) {
      price += session.answers.windows * 12;
    }

    if (session.answers.elevator === false) {
      price += 40;
    }

    if (session.answers.oven === true) {
      price += 45;
    }

    if (session.answers.balcony === true) {
      price += 35;
    }
  }

  if (service === "reinigung") {
    price = 120;

    if (session.answers.area) {
      price += session.answers.area * 1.2;
    }
  }

  if (service === "fenster") {
    price = 90;

    if (session.answers.windows) {
      price += session.answers.windows * 10;
    }

    if (session.answers.elevator === false) {
      price += 30;
    }
  }

  if (service === "hauswartung") {
    price = 150;

    if (session.answers.frequency?.toLowerCase().includes("regel")) {
      price += 100;
    }
  }

  if (service === "kleinreparaturen") {
    price = 80;
  }

  const rounded = Math.round(price / 5) * 5;

  return {
    estimatedPrice: rounded,
    priceRange: `CHF ${Math.max(rounded - 40, 0)} – ${rounded + 80}`,
  };
}