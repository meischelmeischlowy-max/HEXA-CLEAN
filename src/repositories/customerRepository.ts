import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const customerRepository = {
  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
    });
  },

  findByEmail(email: string) {
    return prisma.customer.findFirst({
      where: { email },
    });
  },

  findByPhone(phone: string) {
    return prisma.customer.findFirst({
      where: { phone },
    });
  },

  findAll() {
    return prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.customer.delete({
      where: { id },
    });
  },
};