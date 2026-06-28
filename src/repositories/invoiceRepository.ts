import prisma from "@/lib/prisma";
import type { Prisma, InvoiceStatus } from "@prisma/client";

export const invoiceRepository = {
  create(data: Prisma.InvoiceUncheckedCreateInput) {
    return prisma.invoice.create({
      data,
    });
  },

  findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true,
        quote: true,
        payments: true,
        attachments: true,
      },
    });
  },

  findAll() {
    return prisma.invoice.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        order: true,
      },
    });
  },

  findByCustomerId(customerId: string) {
    return prisma.invoice.findMany({
      where: { customerId },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  update(id: string, data: Prisma.InvoiceUpdateInput) {
    return prisma.invoice.update({
      where: { id },
      data,
    });
  },

  updateStatus(id: string, status: InvoiceStatus) {
    return prisma.invoice.update({
      where: { id },
      data: {
        status,
      },
    });
  },
};
