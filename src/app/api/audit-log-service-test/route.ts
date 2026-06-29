import { NextResponse } from "next/server";

import { auditLogService } from "@/services/auditLogService";

export async function POST() {
  try {
    const auditLog = await auditLogService.createAuditLog({
      action: "CREATE" as never,
      entityType: "AuditLog",
      entityId: `test-${Date.now()}`,
      actorType: "system",
      actorId: "system",
      message: "Audit Log Service test entry",
      metadata: {
        source: "audit-log-service-test",
      },
      after: {
        status: "created",
      },
    });

    return NextResponse.json({
      layer: "audit-log-service",
      message: "Audit Log Service works",
      test: {
        auditLogCreated: true,
        auditLogId: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
      },
      data: auditLog,
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "audit-log-service",
        message: "Audit Log Service failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}