export type ServiceType =
  | "reinigung"
  | "fenster"
  | "hauswartung"
  | "umzug"
  | "kleinreparaturen";

export type Sender = "user" | "assistant";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  time: string;
}

export interface ProgressState {
  service?: ServiceType;
  serviceLabel?: string;
  area?: number;
  windows?: number;
  floor?: string;
  elevator?: boolean;
  date?: string;
  estimatedPrice?: number;
  priceRange?: string;
  progress: number;
}

export interface ServiceCard {
  id: ServiceType;
  title: string;
  icon: string;
  basePrice: number;
  question: string;
}

export const SERVICES: ServiceCard[] = [
  {
    id: "reinigung",
    title: "Reinigung",
    icon: "🧹",
    basePrice: 120,
    question:
      "Gerne. Wie groß ist die zu reinigende Fläche ungefähr in Quadratmetern?",
  },
  {
    id: "fenster",
    title: "Fensterreinigung",
    icon: "🪟",
    basePrice: 90,
    question:
      "Sehr gerne. Wie viele Fenster sollen ungefähr gereinigt werden?",
  },
  {
    id: "hauswartung",
    title: "Hauswartung",
    icon: "🏠",
    basePrice: 150,
    question:
      "Gerne. Geht es um eine regelmäßige Hauswartung oder um einen einmaligen Einsatz?",
  },
  {
    id: "umzug",
    title: "Umzugsreinigung",
    icon: "🚚",
    basePrice: 280,
    question:
      "Gerne. Wie groß ist die Wohnung ungefähr in Quadratmetern?",
  },
  {
    id: "kleinreparaturen",
    title: "Kleinreparaturen",
    icon: "🛠️",
    basePrice: 80,
    question:
      "Gerne. Beschreiben Sie bitte kurz, welche Reparatur benötigt wird.",
  },
];

export const START_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "assistant",
    text:
      "👋 Willkommen bei HEXA CLEAN!\n\nWir sind Michal & Monika und helfen Ihnen gerne weiter.\n\nWählen Sie bitte eine Dienstleistung oder schreiben Sie uns direkt Ihre Anfrage.",
    time: "Jetzt",
  },
];