import { Prisma, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const paymentRepository = {
  async create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({
      data,
    });
  },

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
    });
  },

  async findByInvoiceId(invoiceId: string) {
    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findAll() {
    return prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, data: Prisma.PaymentUpdateInput) {
    return prisma.payment.update({
      where: { id },
      data,
    });
  },

  async updateStatus(id: string, status: PaymentStatus) {
    return prisma.payment.update({
      where: { id },
      data: {
        status,
      },
    });
  },

  async delete(id: string) {
    return prisma.payment.delete({
      where: { id },
    });
  },
};