import { dashboardRepository } from "@/repositories/dashboardRepository";

export const dashboardService = {
  async getOverview() {
    const counts = await dashboardRepository.getSystemCounts();

    return {
      status: "OK",
      message: "HEXA OS Dashboard overview loaded",
      counts,
    };
  },

  async getRecentActivity() {
    const activity = await dashboardRepository.getRecentActivity();

    return {
      status: "OK",
      message: "HEXA OS Dashboard recent activity loaded",
      activity,
    };
  },

  async getCustomers() {
    const customers = await dashboardRepository.getCustomers();

    return {
      status: "OK",
      message: "HEXA OS Dashboard customers loaded",
      customers,
    };
  },

  async getCustomerDetails(customerId: string) {
    const details = await dashboardRepository.getCustomerDetails(customerId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Customer not found",
        customerId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard customer details loaded",
      customerId,
      details,
    };
  },

  async getOrders() {
    const orders = await dashboardRepository.getOrders();

    return {
      status: "OK",
      message: "HEXA OS Dashboard orders loaded",
      orders,
    };
  },

  async getOrderDetails(orderId: string) {
    const details = await dashboardRepository.getOrderDetails(orderId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Order not found",
        orderId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard order details loaded",
      orderId,
      details,
    };
  },

  async getQuotes() {
    const quotes = await dashboardRepository.getQuotes();

    return {
      status: "OK",
      message: "HEXA OS Dashboard quotes loaded",
      quotes,
    };
  },

  async getQuoteDetails(quoteId: string) {
    const details = await dashboardRepository.getQuoteDetails(quoteId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Quote not found",
        quoteId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard quote details loaded",
      quoteId,
      details,
    };
  },

  async getInvoices() {
    const invoices = await dashboardRepository.getInvoices();

    return {
      status: "OK",
      message: "HEXA OS Dashboard invoices loaded",
      invoices,
    };
  },

  async getInvoiceDetails(invoiceId: string) {
    const details = await dashboardRepository.getInvoiceDetails(invoiceId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Invoice not found",
        invoiceId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard invoice details loaded",
      invoiceId,
      details,
    };
  },

  async getPayments() {
    const payments = await dashboardRepository.getPayments();

    return {
      status: "OK",
      message: "HEXA OS Dashboard payments loaded",
      payments,
    };
  },

  async getPaymentDetails(paymentId: string) {
    const details = await dashboardRepository.getPaymentDetails(paymentId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Payment not found",
        paymentId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard payment details loaded",
      paymentId,
      details,
    };
  },

  async getNotifications() {
    const notifications = await dashboardRepository.getNotifications();

    return {
      status: "OK",
      message: "HEXA OS Dashboard notifications loaded",
      notifications,
    };
  },

  async getNotificationDetails(notificationId: string) {
    const details =
      await dashboardRepository.getNotificationDetails(notificationId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Notification not found",
        notificationId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard notification details loaded",
      notificationId,
      details,
    };
  },

  async getAttachments() {
    const attachments = await dashboardRepository.getAttachments();

    return {
      status: "OK",
      message: "HEXA OS Dashboard attachments loaded",
      attachments,
    };
  },

  async getAttachmentDetails(attachmentId: string) {
    const details = await dashboardRepository.getAttachmentDetails(attachmentId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Attachment not found",
        attachmentId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard attachment details loaded",
      attachmentId,
      details,
    };
  },

  async getAuditLogs() {
    const auditLogs = await dashboardRepository.getAuditLogs();

    return {
      status: "OK",
      message: "HEXA OS Dashboard audit logs loaded",
      auditLogs,
    };
  },

  async getAuditLogDetails(auditLogId: string) {
    const details = await dashboardRepository.getAuditLogDetails(auditLogId);

    if (!details) {
      return {
        status: "NOT_FOUND",
        message: "Audit log not found",
        auditLogId,
      };
    }

    return {
      status: "OK",
      message: "HEXA OS Dashboard audit log details loaded",
      auditLogId,
      details,
    };
  },
};