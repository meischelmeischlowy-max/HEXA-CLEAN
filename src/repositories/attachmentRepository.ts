import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const attachmentRepository = {
  async create(data: Prisma.AttachmentCreateInput) {
    return prisma.attachment.create({
      data,
    });
  },

  async findById(id: string) {
    return prisma.attachment.findUnique({
      where: { id },
    });
  },

  async findAll() {
    return prisma.attachment.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async update(id: string, data: Prisma.AttachmentUpdateInput) {
    return prisma.attachment.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.attachment.delete({
      where: { id },
    });
  },
};