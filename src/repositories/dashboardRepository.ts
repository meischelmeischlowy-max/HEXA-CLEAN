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

  async getRecentActivity() {
    const [
      recentOrders,
      recentQuotes,
      recentInvoices,
      recentPayments,
      recentNotifications,
      recentAttachments,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.attachment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      recentOrders,
      recentQuotes,
      recentInvoices,
      recentPayments,
      recentNotifications,
      recentAttachments,
      recentAuditLogs,
    };
  },

  async getCustomers() {
    return prisma.customer.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getCustomerDetails(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return null;
    }

    const [
      sessions,
      orders,
      quotes,
      invoices,
      notifications,
      attachments,
      auditLogs,
    ] = await Promise.all([
      prisma.session.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.order.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.quote.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.invoice.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.notification.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.attachment.findMany({
        where: {
          customerId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.auditLog.findMany({
        where: {
          customerId,
        },
        take: 100,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const sessionIds = sessions.map((session) => session.id);
    const invoiceIds = invoices.map((invoice) => invoice.id);

    const [conversationMessages, payments] = await Promise.all([
      sessionIds.length > 0
        ? prisma.conversationMessage.findMany({
            where: {
              sessionId: {
                in: sessionIds,
              },
            },
            take: 100,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),

      invoiceIds.length > 0
        ? prisma.payment.findMany({
            where: {
              invoiceId: {
                in: invoiceIds,
              },
            },
            take: 50,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      customer,
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

  async getOrders() {
    return prisma.order.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getQuotes() {
    return prisma.quote.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getInvoices() {
    return prisma.invoice.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getPayments() {
    return prisma.payment.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getNotifications() {
    return prisma.notification.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getAttachments() {
    return prisma.attachment.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getAuditLogs() {
    return prisma.auditLog.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};