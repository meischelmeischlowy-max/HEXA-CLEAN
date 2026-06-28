import { conversationRepository } from "@/repositories/conversationRepository";
import type { MessageRole, Prisma } from "@prisma/client";

type AddMessageInput = {
  sessionId: string;
  customerId?: string;
  role: MessageRole;
  content: string;
  metadata?: Prisma.InputJsonObject;
};

function cleanContent(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new Error("Message content is required");
  }

  return cleaned;
}

async function addMessage(input: AddMessageInput) {
  const data: Prisma.ConversationMessageUncheckedCreateInput = {
    sessionId: input.sessionId,
    role: input.role,
    content: cleanContent(input.content),
  };

  if (input.customerId) {
    data.customerId = input.customerId;
  }

  if (input.metadata) {
    data.metadata = input.metadata;
  }

  return conversationRepository.createMessage(data);
}

export const conversationService = {
  addMessage,

  async addUserMessage(sessionId: string, content: string, customerId?: string) {
    return addMessage({
      sessionId,
      customerId,
      role: "USER",
      content,
    });
  },

  async addAssistantMessage(
    sessionId: string,
    content: string,
    customerId?: string
  ) {
    return addMessage({
      sessionId,
      customerId,
      role: "ASSISTANT",
      content,
    });
  },

  async getHistory(sessionId: string) {
    return conversationRepository.findBySessionId(sessionId);
  },

  async clearHistory(sessionId: string) {
    return conversationRepository.deleteBySessionId(sessionId);
  },
};