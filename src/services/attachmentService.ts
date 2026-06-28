import { Prisma } from "@prisma/client";
import { attachmentRepository } from "@/repositories/attachmentRepository";

export const attachmentService = {
  async createAttachment(data: Prisma.AttachmentCreateInput) {
    return attachmentRepository.create(data);
  },

  async getAttachmentById(id: string) {
    return attachmentRepository.findById(id);
  },

  async getAllAttachments() {
    return attachmentRepository.findAll();
  },

  async updateAttachment(id: string, data: Prisma.AttachmentUpdateInput) {
    return attachmentRepository.update(id, data);
  },

  async deleteAttachment(id: string) {
    return attachmentRepository.delete(id);
  },
};