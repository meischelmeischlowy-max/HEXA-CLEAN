import { randomUUID } from "crypto";

export type ConversationRole = "user" | "assistant" | "system";

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
}

export class ConversationEngine {
  private messages: ConversationMessage[] = [];

  addMessage(
    sessionId: string,
    role: ConversationRole,
    content: string
  ): ConversationMessage {

    const message: ConversationMessage = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(message);

    return message;
  }

  getMessages(sessionId: string): ConversationMessage[] {
    return this.messages.filter(
      (message) => message.sessionId === sessionId
    );
  }

  clearConversation(sessionId: string): void {
    this.messages = this.messages.filter(
      (message) => message.sessionId !== sessionId
    );
  }

  getAllMessages(): ConversationMessage[] {
    return this.messages;
  }
}

export const conversationEngine = new ConversationEngine();