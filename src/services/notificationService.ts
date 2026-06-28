import { Prisma } from "@prisma/client";
import { notificationRepository } from "@/repositories/notificationRepository";

export const notificationService = {
  async createNotification(data: Prisma.NotificationCreateInput) {
    return notificationRepository.create(data);
  },

  async getNotificationById(id: string) {
    return notificationRepository.findById(id);
  },

  async getAllNotifications() {
    return notificationRepository.findAll();
  },

  async updateNotification(id: string, data: Prisma.NotificationUpdateInput) {
    return notificationRepository.update(id, data);
  },

  async deleteNotification(id: string) {
    return notificationRepository.delete(id);
  },
};