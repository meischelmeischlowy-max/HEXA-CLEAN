import { prisma } from "@/lib/prisma";

export const dashboardInvoiceActionsRepository = {
  async markInvoiceAsSent(invoiceId: string) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      });

      if (!invoice) {
        return null;
      }

      if (invoice.status === "SENT" || invoice.status === "PAID") {
        return {
          invoice,
          updatedInvoice: invoice,
          updated: false,
        };
      }

      const now = new Date();

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: "SENT",
          sentAt: now,
        },
      });

      const order = invoice.orderId
        ? await tx.order.findUnique({
            where: {
              id: invoice.orderId,
            },
          })
        : null;

      const quote = invoice.quoteId
        ? await tx.quote.findUnique({
            where: {
              id: invoice.quoteId,
            },
          })
        : null;

      const sessionId = quote?.sessionId ?? order?.sessionId ?? null;

      await tx.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          sessionId,
          action: "STATUS_CHANGE",
          entityType: "Invoice",
          entityId: invoice.id,
          actorType: "dashboard",
          before: {
            status: invoice.status,
            sentAt: invoice.sentAt,
          },
          after: {
            status: updatedInvoice.status,
            sentAt: updatedInvoice.sentAt,
          },
          message: `Invoice ${invoice.invoiceNumber} marked as sent`,
          metadata: {
            source: "dashboard_quick_action",
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });

      return {
        invoice,
        updatedInvoice,
        updated: true,
      };
    });
  },
};