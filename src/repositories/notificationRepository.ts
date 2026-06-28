import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const notificationRepository = {
  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({
      data,
    });
  },

  async findById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
    });
  },

  async findAll() {
    return prisma.notification.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async update(id: string, data: Prisma.NotificationUpdateInput) {
    return prisma.notification.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.notification.delete({
      where: { id },
    });
  },
};