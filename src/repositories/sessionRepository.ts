import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const sessionRepository = {
  create(data: Prisma.SessionUncheckedCreateInput) {
    return prisma.session.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: {
        customer: true,
        messages: true,
        orders: true,
      },
    });
  },

  findActiveByCustomerId(customerId: string) {
    return prisma.session.findMany({
      where: {
        customerId,
        status: "ACTIVE",
      },
      orderBy: {
        startedAt: "desc",
      },
    });
  },

  update(id: string, data: Prisma.SessionUpdateInput) {
    return prisma.session.update({
      where: { id },
      data,
    });
  },

  complete(id: string) {
    return prisma.session.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });
  },
};