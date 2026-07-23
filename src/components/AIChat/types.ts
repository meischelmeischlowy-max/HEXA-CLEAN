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
    icon: "đź§ą",
    basePrice: 120,
    question:
      "Gerne. Wie groĂź ist die zu reinigende FlĂ¤che ungefĂ¤hr in Quadratmetern?",
  },
  {
    id: "fenster",
    title: "Fensterreinigung",
    icon: "đźŞź",
    basePrice: 90,
    question:
      "Sehr gerne. Wie viele Fenster sollen ungefĂ¤hr gereinigt werden?",
  },
  {
    id: "hauswartung",
    title: "Hauswartung",
    icon: "đźŹ ",
    basePrice: 150,
    question:
      "Gerne. Geht es um eine regelmĂ¤Ăźige Hauswartung oder um einen einmaligen Einsatz?",
  },
  {
    id: "umzug",
    title: "Umzugsreinigung",
    icon: "đźšš",
    basePrice: 280,
    question:
      "Gerne. Wie groĂź ist die Wohnung ungefĂ¤hr in Quadratmetern?",
  },
  {
    id: "kleinreparaturen",
    title: "Kleinreparaturen",
    icon: "đź› ď¸Ź",
    basePrice: 80,
    question:
      "Gerne. Beschreiben Sie bitte kurz, welche Reparatur benĂ¶tigt wird.",
  },
];

export const START_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "assistant",
    text:
      "Willkommen bei HEXA CLEAN!\n\nIch helfe Ihnen, die passende Dienstleistung und eine erste unverbindliche Preisspanne zu bestimmen.\n\nWählen Sie eine Dienstleistung oder beschreiben Sie direkt Ihre Anfrage.",
    time: "Jetzt",
  },
];
