import { randomUUID } from "crypto";

export type SessionStatus = "active" | "completed" | "cancelled";

export type SessionMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type ClientSession = {
  sessionId: string;
  orderId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  messages: SessionMessage[];
  answers: Record<string, unknown>;
  estimatedPrice?: number;
};

export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `HC-${year}-${randomNumber}`;
}

export function createSession(): ClientSession {
  const now = new Date().toISOString();

  return {
    sessionId: randomUUID(),
    orderId: generateOrderId(),
    status: "active",
    createdAt: now,
    updatedAt: now,
    messages: [],
    answers: {},
  };
}

export function addMessageToSession(
  session: ClientSession,
  role: SessionMessage["role"],
  content: string
): ClientSession {
  const now = new Date().toISOString();

  return {
    ...session,
    updatedAt: now,
    messages: [
      ...session.messages,
      {
        id: randomUUID(),
        role,
        content,
        createdAt: now,
      },
    ],
  };
}