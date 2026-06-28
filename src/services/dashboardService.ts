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

  async getOrders() {
    const orders = await dashboardRepository.getOrders();

    return {
      status: "OK",
      message: "HEXA OS Dashboard orders loaded",
      orders,
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

  async getInvoices() {
    const invoices = await dashboardRepository.getInvoices();

    return {
      status: "OK",
      message: "HEXA OS Dashboard invoices loaded",
      invoices,
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

  async getNotifications() {
    const notifications = await dashboardRepository.getNotifications();

    return {
      status: "OK",
      message: "HEXA OS Dashboard notifications loaded",
      notifications,
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
};