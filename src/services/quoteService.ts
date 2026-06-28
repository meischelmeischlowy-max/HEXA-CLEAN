import { quoteRepository } from "@/repositories/quoteRepository";
import type { Prisma, QuoteStatus } from "@prisma/client";

type CreateQuoteInput = {
  customerId: string;
  orderId?: string;
  sessionId?: string;
  subtotal: number;
  taxRate?: number;
  currency?: string;
  items?: Prisma.InputJsonValue;
  notes?: string;
  validUntil?: Date;
};

function generateQuoteNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `Q-${year}${month}${day}-${random}`;
}

function cleanText(value?: string) {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

export const quoteService = {
  async createQuote(input: CreateQuoteInput) {
    const taxRate = input.taxRate ?? 0;
    const taxAmount = Number(((input.subtotal * taxRate) / 100).toFixed(2));
    const total = Number((input.subtotal + taxAmount).toFixed(2));

    const data: Prisma.QuoteUncheckedCreateInput = {
      quoteNumber: generateQuoteNumber(),
      customerId: input.customerId,
      subtotal: input.subtotal,
      taxRate,
      taxAmount,
      total,
      currency: input.currency ?? "CHF",
      status: "DRAFT",
    };

    if (input.orderId) {
      data.orderId = input.orderId;
    }

    if (input.sessionId) {
      data.sessionId = input.sessionId;
    }

    if (input.items) {
      data.items = input.items;
    }

    if (input.notes) {
      data.notes = cleanText(input.notes);
    }

    if (input.validUntil) {
      data.validUntil = input.validUntil;
    }

    return quoteRepository.create(data);
  },

  async getQuoteById(id: string) {
    const quote = await quoteRepository.findById(id);

    if (!quote) {
      throw new Error("Quote not found");
    }

    return quote;
  },

  async updateQuoteStatus(id: string, status: QuoteStatus) {
    return quoteRepository.updateStatus(id, status);
  },
};