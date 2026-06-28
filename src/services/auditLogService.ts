import { Prisma } from "@prisma/client";
import { auditLogRepository } from "@/repositories/auditLogRepository";

export const auditLogService = {
  async createAuditLog(data: Prisma.AuditLogCreateInput) {
    return auditLogRepository.create(data);
  },

  async getAuditLogById(id: string) {
    return auditLogRepository.findById(id);
  },

  async getAllAuditLogs() {
    return auditLogRepository.findAll();
  },

  async updateAuditLog(id: string, data: Prisma.AuditLogUpdateInput) {
    return auditLogRepository.update(id, data);
  },

  async deleteAuditLog(id: string) {
    return auditLogRepository.delete(id);
  },
};