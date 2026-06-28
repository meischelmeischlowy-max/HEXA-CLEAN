import prisma from "@/lib/prisma";
import type { Prisma, OrderStatus } from "@prisma/client";

export const orderRepository = {
  create(data: Prisma.OrderUncheckedCreateInput) {
    return prisma.order.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        session: true,
        quotes: true,
        invoices: true,
        payments: true,
        attachments: true,
      },
    });
  },

  findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
    });
  },

  findAll() {
    return prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
      },
    });
  },

  findByCustomerId(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({
      where: { id },
      data,
    });
  },

  updateStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
      },
    });
  },
};