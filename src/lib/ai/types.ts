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
  | "frequency"
  | "description"
  | "date"
  | "summary";

export type AIAnswerState = {
  service?: ServiceType;
  serviceLabel?: string;

  area?: number;
  windows?: number;
  floor?: string;
  elevator?: boolean;

  oven?: boolean;
  balcony?: boolean;

  frequency?: string;
  description?: string;
  date?: string;

  name?: string;
  contact?: string;
  email?: string;
  phone?: string;
};

export type AISession = {
  step: ConversationStep;
  answers: AIAnswerState;
  progress: number;
  estimatedPrice: number;
  priceRange: string;
  completed: boolean;
};

export type AIEngineInput = {
  message: string;
  session: AISession;
};

export type AIEngineResult = {
  reply: string;
  session: AISession;
}