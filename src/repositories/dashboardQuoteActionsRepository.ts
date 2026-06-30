import { prisma } from "@/lib/prisma";

export const dashboardQuoteActionsRepository = {
  async markQuoteAsAccepted(quoteId: string) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: {
          id: quoteId,
        },
      });

      if (!quote) {
        return null;
      }

      if (quote.status === "ACCEPTED") {
        return {
          quote,
          updatedQuote: quote,
          updated: false,
        };
      }

      const now = new Date();

      const updatedQuote = await tx.quote.update({
        where: {
          id: quote.id,
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: quote.customerId,
          orderId: quote.orderId,
          sessionId: quote.sessionId,
          action: "STATUS_CHANGE",
          entityType: "Quote",
          entityId: quote.id,
          actorType: "dashboard",
          before: {
            status: quote.status,
            acceptedAt: quote.acceptedAt,
          },
          after: {
            status: updatedQuote.status,
            acceptedAt: updatedQuote.acceptedAt,
          },
          message: `Quote ${quote.quoteNumber} marked as accepted`,
          metadata: {
            source: "dashboard_quick_action",
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
          },
        },
      });

      return {
        quote,
        updatedQuote,
        updated: true,
      };
    });
  },

  async markQuoteAsSent(quoteId: string) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: {
          id: quoteId,
        },
      });

      if (!quote) {
        return null;
      }

      if (quote.status === "SENT" || quote.status === "ACCEPTED") {
        return {
          quote,
          updatedQuote: quote,
          updated: false,
        };
      }

      const now = new Date();

      const updatedQuote = await tx.quote.update({
        where: {
          id: quote.id,
        },
        data: {
          status: "SENT",
          sentAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: quote.customerId,
          orderId: quote.orderId,
          sessionId: quote.sessionId,
          action: "STATUS_CHANGE",
          entityType: "Quote",
          entityId: quote.id,
          actorType: "dashboard",
          before: {
            status: quote.status,
            sentAt: quote.sentAt,
          },
          after: {
            status: updatedQuote.status,
            sentAt: updatedQuote.sentAt,
          },
          message: `Quote ${quote.quoteNumber} marked as sent`,
          metadata: {
            source: "dashboard_quick_action",
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
          },
        },
      });

      return {
        quote,
        updatedQuote,
        updated: true,
      };
    });
  },
};