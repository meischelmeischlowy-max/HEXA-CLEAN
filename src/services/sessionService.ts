import { sessionRepository } from "@/repositories/sessionRepository";

type StartSessionInput = {
  customerId?: string;
  source?: string;
};

export const sessionService = {
  async startSession(input: StartSessionInput = {}) {
    const session = await sessionRepository.create({
      customerId: input.customerId,
      source: input.source ?? "website",
      status: "ACTIVE",
    });

    return session;
  },

  async getSessionById(id: string) {
    const session = await sessionRepository.findById(id);

    if (!session) {
      throw new Error("Session not found");
    }

    return session;
  },

  async completeSession(id: string) {
    const session = await sessionRepository.complete(id);

    return session;
  },
};