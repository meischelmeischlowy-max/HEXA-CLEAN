import { NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { auditLogService } from "@/services/auditLogService";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const allowedActions = Object.values(AuditAction);

    const actionFromBody =
      typeof body.action === "string" ? body.action : allowedActions[0];

    if (!allowedActions.includes(actionFromBody as AuditAction)) {
      return NextResponse.json(
        {
          layer: "audit-log-service",
          message: "Invalid audit action",
          allowedActions,
        },
        { status: 400 }
      );
    }

    const auditLogData: Prisma.AuditLogCreateInput = {
      action: actionFromBody as AuditAction,
      entityType: body.entityType ?? "SYSTEM_TEST",
      entityId: body.entityId ?? null,
      actorType: body.actorType ?? "system",
      actorId: body.actorId ?? null,
      message:
        body.message ??
        "AuditLog Service works. This is a test audit log from HEXA OS.",
      metadata: {
        source: "audit-log-service-test",
        createdBy: "HEXA OS backend test",
      },
      before: body.before ?? null,
      after: body.after ?? {
        status: "AUDIT_LOG_CREATED",
      },
      ipAddress: body.ipAddress ?? "127.0.0.1",

      ...(body.customerId
        ? {
            customer: {
              connect: {
                id: body.customerId,
              },
            },
          }
        : {}),

      ...(body.orderId
        ? {
            order: {
              connect: {
                id: body.orderId,
              },
            },
          }
        : {}),

      ...(body.sessionId
        ? {
            session: {
              connect: {
                id: body.sessionId,
              },
            },
          }
        : {}),
    };

    const auditLog = await auditLogService.createAuditLog(auditLogData);

    const loadedAuditLog = await auditLogService.getAuditLogById(auditLog.id);

    const auditLogs = await auditLogService.getAllAuditLogs();

    return NextResponse.json({
      layer: "audit-log-service",
      message: "AuditLog Service works",
      test: {
        auditLogCreated: true,
        auditLogId: auditLog.id,
        loadedAuditLogId: loadedAuditLog?.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        auditLogsCount: auditLogs.length,
        allowedActions,
      },
      data: {
        auditLog,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "audit-log-service",
        message: "AuditLog Service failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}