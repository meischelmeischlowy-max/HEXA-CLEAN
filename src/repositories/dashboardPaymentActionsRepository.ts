import { prisma } from "@/lib/prisma";

export const dashboardPaymentActionsRepository = {
  async createPaymentFromInvoice(invoiceId: string) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: {
          id: invoiceId,
        },
      });

      if (!invoice) {
        return null;
      }

      const existingPayment = await tx.payment.findFirst({
        where: {
          invoiceId: invoice.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (existingPayment) {
        return {
          invoice,
          payment: existingPayment,
          created: false,
        };
      }

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

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const externalRef = `PAY-${datePart}-${randomPart}`;

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          amount: invoice.total,
          currency: invoice.currency,
          status: "PENDING",
          method: "BANK_TRANSFER",
          externalRef,
          notes: `Payment created from invoice ${invoice.invoiceNumber}`,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: invoice.customerId,
          orderId: invoice.orderId,
          sessionId,
          action: "CREATE",
          entityType: "Payment",
          entityId: payment.id,
          actorType: "dashboard",
          message: `Payment ${payment.externalRef} created from invoice ${invoice.invoiceNumber}`,
          metadata: {
            source: "dashboard_quick_action",
            invoiceId: invoice.id,
            paymentId: payment.id,
            externalRef: payment.externalRef,
          },
        },
      });

      return {
        invoice,
        payment,
        created: true,
      };
    });
  },

  async markPaymentAsPaid(paymentId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          id: paymentId,
        },
      });

      if (!payment) {
        return null;
      }

      const invoice = payment.invoiceId
        ? await tx.invoice.findUnique({
            where: {
              id: payment.invoiceId,
            },
          })
        : null;

      const order =
        invoice?.orderId || payment.orderId
          ? await tx.order.findUnique({
              where: {
                id: invoice?.orderId ?? payment.orderId!,
              },
            })
          : null;

      const quote = invoice?.quoteId
        ? await tx.quote.findUnique({
            where: {
              id: invoice.quoteId,
            },
          })
        : null;

      const sessionId = quote?.sessionId ?? order?.sessionId ?? null;
      const customerId = invoice?.customerId ?? order?.customerId ?? null;
      const orderId = invoice?.orderId ?? payment.orderId ?? null;

      if (payment.status === "PAID") {
        return {
          payment,
          invoice,
          updatedInvoice: invoice,
          updated: false,
        };
      }

      const now = new Date();

      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "PAID",
          paidAt: now,
        },
      });

      const updatedInvoice = invoice
        ? await tx.invoice.update({
            where: {
              id: invoice.id,
            },
            data: {
              status: "PAID",
              paidAmount: invoice.total,
              paidAt: now,
            },
          })
        : null;

      await tx.auditLog.create({
        data: {
          customerId,
          orderId,
          sessionId,
          action: "STATUS_CHANGE",
          entityType: "Payment",
          entityId: updatedPayment.id,
          actorType: "dashboard",
          before: {
            status: payment.status,
            paidAt: payment.paidAt,
          },
          after: {
            status: updatedPayment.status,
            paidAt: updatedPayment.paidAt,
            invoiceStatus: updatedInvoice?.status ?? null,
            invoicePaidAmount: updatedInvoice?.paidAmount
              ? String(updatedInvoice.paidAmount)
              : null,
          },
          message: `Payment ${
            updatedPayment.externalRef ?? updatedPayment.id
          } marked as paid`,
          metadata: {
            source: "dashboard_quick_action",
            paymentId: updatedPayment.id,
            invoiceId: invoice?.id ?? null,
          },
        },
      });

      return {
        payment: updatedPayment,
        invoice,
        updatedInvoice,
        updated: true,
      };
    });
  },
};