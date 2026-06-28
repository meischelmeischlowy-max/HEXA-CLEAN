import { prisma } from "@/lib/prisma";

export const dashboardRepository = {
  async getSystemCounts() {
    const [
      customers,
      sessions,
      conversationMessages,
      orders,
      quotes,
      invoices,
      payments,
      notifications,
      attachments,
      auditLogs,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.session.count(),
      prisma.conversationMessage.count(),
      prisma.order.count(),
      prisma.quote.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.notification.count(),
      prisma.attachment.count(),
      prisma.auditLog.count(),
    ]);

    return {
      customers,
      sessions,
      conversationMessages,
      orders,
      quotes,
      invoices,
      payments,
      notifications,
      attachments,
      auditLogs,
    };
  },
};