import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const conversationRepository = {
  createMessage(data: Prisma.ConversationMessageUncheckedCreateInput) {
    return prisma.conversationMessage.create({
      data,
    });
  },

  findBySessionId(sessionId: string) {
    return prisma.conversationMessage.findMany({
      where: {
        sessionId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  deleteBySessionId(sessionId: string) {
    return prisma.conversationMessage.deleteMany({
      where: {
        sessionId,
      },
    });
  },
};