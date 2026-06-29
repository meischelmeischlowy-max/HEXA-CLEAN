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

  async getOrderDetails(orderId: string) {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return null;
    }

    const customerId = order.customerId;
    const sessionId = order.sessionId;

    const [
      customer,
      session,
      quotes,
      invoices,
      notifications,
      attachments,
      auditLogs,
      conversationMessages,
    ] = await Promise.all([
      customerId
        ? prisma.customer.findUnique({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),

      sessionId
        ? prisma.session.findUnique({
            where: {
              id: sessionId,
            },
          })
        : Promise.resolve(null),

      prisma.quote.findMany({
        where: {
          orderId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.invoice.findMany({
        where: {
          orderId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.notification.findMany({
        where: {
          orderId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.attachment.findMany({
        where: {
          orderId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.auditLog.findMany({
        where: {
          orderId,
        },
        take: 100,
        orderBy: {
          createdAt: "desc",
        },
      }),

      sessionId
        ? prisma.conversationMessage.findMany({
            where: {
              sessionId,
            },
            take: 100,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    const invoiceIds = invoices.map((invoice) => invoice.id);

    const payments =
      invoiceIds.length > 0
        ? await prisma.payment.findMany({
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
        : [];

    return {
      order,
      customer,
      session,
      conversationMessages,
      quotes,
      invoices,
      payments,
      notifications,
      attachments,
      auditLogs,
    };
  },

  async getQuotes() {
    return prisma.quote.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getQuoteDetails(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: {
        id: quoteId,
      },
    });

    if (!quote) {
      return null;
    }

    const customerId = quote.customerId;
    const orderId = quote.orderId;
    const sessionId = quote.sessionId;

    const auditLogWhereConditions: {
      entityId?: string;
      customerId?: string;
      orderId?: string;
      sessionId?: string;
    }[] = [{ entityId: quoteId }];

    if (customerId) {
      auditLogWhereConditions.push({ customerId });
    }

    if (orderId) {
      auditLogWhereConditions.push({ orderId });
    }

    if (sessionId) {
      auditLogWhereConditions.push({ sessionId });
    }

    const [
      customer,
      order,
      session,
      invoices,
      notifications,
      attachments,
      auditLogs,
      conversationMessages,
    ] = await Promise.all([
      customerId
        ? prisma.customer.findUnique({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),

      orderId
        ? prisma.order.findUnique({
            where: {
              id: orderId,
            },
          })
        : Promise.resolve(null),

      sessionId
        ? prisma.session.findUnique({
            where: {
              id: sessionId,
            },
          })
        : Promise.resolve(null),

      prisma.invoice.findMany({
        where: {
          quoteId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      customerId || orderId || sessionId
        ? prisma.notification.findMany({
            where: {
              OR: [
                ...(customerId ? [{ customerId }] : []),
                ...(orderId ? [{ orderId }] : []),
                ...(sessionId ? [{ sessionId }] : []),
              ],
            },
            take: 50,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),

      prisma.attachment.findMany({
        where: {
          quoteId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.auditLog.findMany({
        where: {
          OR: auditLogWhereConditions,
        },
        take: 100,
        orderBy: {
          createdAt: "desc",
        },
      }),

      sessionId
        ? prisma.conversationMessage.findMany({
            where: {
              sessionId,
            },
            take: 100,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    const invoiceIds = invoices.map((invoice) => invoice.id);

    const payments =
      invoiceIds.length > 0
        ? await prisma.payment.findMany({
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
        : [];

    return {
      quote,
      customer,
      order,
      session,
      conversationMessages,
      invoices,
      payments,
      notifications,
      attachments,
      auditLogs,
    };
  },

  async getInvoices() {
    return prisma.invoice.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getInvoiceDetails(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
    });

    if (!invoice) {
      return null;
    }

    const customerId = invoice.customerId;
    const orderId = invoice.orderId;
    const quoteId = invoice.quoteId;

    const [customer, order, quote, payments, attachments] = await Promise.all([
      customerId
        ? prisma.customer.findUnique({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),

      orderId
        ? prisma.order.findUnique({
            where: {
              id: orderId,
            },
          })
        : Promise.resolve(null),

      quoteId
        ? prisma.quote.findUnique({
            where: {
              id: quoteId,
            },
          })
        : Promise.resolve(null),

      prisma.payment.findMany({
        where: {
          invoiceId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.attachment.findMany({
        where: {
          invoiceId,
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const sessionId = order?.sessionId ?? quote?.sessionId ?? null;

    const auditLogWhereConditions: {
      entityId?: string;
      customerId?: string;
      orderId?: string;
      sessionId?: string;
    }[] = [{ entityId: invoiceId }];

    if (customerId) {
      auditLogWhereConditions.push({ customerId });
    }

    if (orderId) {
      auditLogWhereConditions.push({ orderId });
    }

    if (sessionId) {
      auditLogWhereConditions.push({ sessionId });
    }

    const [session, conversationMessages, notifications, auditLogs] =
      await Promise.all([
        sessionId
          ? prisma.session.findUnique({
              where: {
                id: sessionId,
              },
            })
          : Promise.resolve(null),

        sessionId
          ? prisma.conversationMessage.findMany({
              where: {
                sessionId,
              },
              take: 100,
              orderBy: {
                createdAt: "desc",
              },
            })
          : Promise.resolve([]),

        customerId || orderId || sessionId
          ? prisma.notification.findMany({
              where: {
                OR: [
                  ...(customerId ? [{ customerId }] : []),
                  ...(orderId ? [{ orderId }] : []),
                  ...(sessionId ? [{ sessionId }] : []),
                ],
              },
              take: 50,
              orderBy: {
                createdAt: "desc",
              },
            })
          : Promise.resolve([]),

        prisma.auditLog.findMany({
          where: {
            OR: auditLogWhereConditions,
          },
          take: 100,
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

    return {
      invoice,
      customer,
      order,
      quote,
      session,
      conversationMessages,
      payments,
      notifications,
      attachments,
      auditLogs,
    };
  },

    async getPayments() {
    return prisma.payment.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getPaymentDetails(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      return null;
    }

    const invoiceId = payment.invoiceId;

    const invoice = invoiceId
      ? await prisma.invoice.findUnique({
          where: {
            id: invoiceId,
          },
        })
      : null;

    const customerId = invoice?.customerId ?? null;
    const orderId = invoice?.orderId ?? null;
    const quoteId = invoice?.quoteId ?? null;

    const [customer, order, quote, attachments] = await Promise.all([
      customerId
        ? prisma.customer.findUnique({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),

      orderId
        ? prisma.order.findUnique({
            where: {
              id: orderId,
            },
          })
        : Promise.resolve(null),

      quoteId
        ? prisma.quote.findUnique({
            where: {
              id: quoteId,
            },
          })
        : Promise.resolve(null),

      invoiceId
        ? prisma.attachment.findMany({
            where: {
              invoiceId,
            },
            take: 50,
            orderBy: {
              createdAt: "desc",
            },
          })
        : Promise.resolve([]),
    ]);

    const sessionId = order?.sessionId ?? quote?.sessionId ?? null;

    const auditLogWhereConditions: {
      entityId?: string;
      customerId?: string;
      orderId?: string;
      sessionId?: string;
    }[] = [{ entityId: paymentId }];

    if (invoiceId) {
      auditLogWhereConditions.push({ entityId: invoiceId });
    }

    if (customerId) {
      auditLogWhereConditions.push({ customerId });
    }

    if (orderId) {
      auditLogWhereConditions.push({ orderId });
    }

    if (sessionId) {
      auditLogWhereConditions.push({ sessionId });
    }

    const [session, conversationMessages, notifications, auditLogs] =
      await Promise.all([
        sessionId
          ? prisma.session.findUnique({
              where: {
                id: sessionId,
              },
            })
          : Promise.resolve(null),

        sessionId
          ? prisma.conversationMessage.findMany({
              where: {
                sessionId,
              },
              take: 100,
              orderBy: {
                createdAt: "desc",
              },
            })
          : Promise.resolve([]),

        customerId || orderId || sessionId
          ? prisma.notification.findMany({
              where: {
                OR: [
                  ...(customerId ? [{ customerId }] : []),
                  ...(orderId ? [{ orderId }] : []),
                  ...(sessionId ? [{ sessionId }] : []),
                ],
              },
              take: 50,
              orderBy: {
                createdAt: "desc",
              },
            })
          : Promise.resolve([]),

        prisma.auditLog.findMany({
          where: {
            OR: auditLogWhereConditions,
          },
          take: 100,
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

    return {
      payment,
      invoice,
      customer,
      order,
      quote,
      session,
      conversationMessages,
      notifications,
      attachments,
      auditLogs,
    };
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