import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const auditLogRepository = {
  async create(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({
      data,
    });
  },

  async findById(id: string) {
    return prisma.auditLog.findUnique({
      where: { id },
    });
  },

  async findAll() {
    return prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async update(id: string, data: Prisma.AuditLogUpdateInput) {
    return prisma.auditLog.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.auditLog.delete({
      where: { id },
    });
  },
};