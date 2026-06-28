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
};