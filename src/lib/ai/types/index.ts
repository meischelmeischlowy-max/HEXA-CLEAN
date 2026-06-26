export type ServiceType =
  | "reinigung"
  | "fenster"
  | "hauswartung"
  | "umzug"
  | "kleinreparaturen";

export type ConversationStep =
  | "start"
  | "service"
  | "area"
  | "windows"
  | "floor"
  | "elevator"
  | "oven"
  | "balcony"
  | "description"
  | "frequency"
  | "date"
  | "summary";

export type Sender = "user" | "assistant";

export interface AIMessage {
  id: string;
  sender: Sender;
  text: string;
  time: string;
}

export interface AIAnswers {
  service?: ServiceType;
  serviceLabel?: string;
  area?: number;
  windows?: number;
  floor?: string;
  elevator?: boolean;
  oven?: boolean;
  balcony?: boolean;
  description?: string;
  frequency?: string;
  date?: string;
}

export interface AISession {
  step: ConversationStep;
  answers: AIAnswers;
  progress: number;
  estimatedPrice: number;
  priceRange: string;
  completed: boolean;
}

export interface AIEngineInput {
  message: string;
  session: AISession;
}

export interface AIEngineResult {
  reply: string;
  session: AISession;
}