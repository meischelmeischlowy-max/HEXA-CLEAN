import prisma from "@/lib/prisma";
import type { Prisma, QuoteStatus } from "@prisma/client";

export const quoteRepository = {
  create(data: Prisma.QuoteUncheckedCreateInput) {
    return prisma.quote.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        session: true,
        invoice: true,
        attachments: true,
      },
    });
  },

  findByQuoteNumber(quoteNumber: string) {
    return prisma.quote.findUnique({
      where: { quoteNumber },
    });
  },

  findByCustomerId(customerId: string) {
    return prisma.quote.findMany({
      where: { customerId },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findByOrderId(orderId: string) {
    return prisma.quote.findMany({
      where: { orderId },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  updateStatus(id: string, status: QuoteStatus) {
    return prisma.quote.update({
      where: { id },
      data: { status },
    });
  },
};