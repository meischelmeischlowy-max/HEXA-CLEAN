import {
  AuditAction,
  EstimateStatus,
  NotificationChannel,
  NotificationStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";
const READY_TO_SEND_NOTIFICATION_SUBJECT =
  "HEXA CLEAN Angebot zur Prüfung vorbereitet";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PatchEstimateBody = {
  status?: unknown;
};

type WorkflowNotificationResult = {
  created: boolean;
  skipped: boolean;
  reason: string | null;
  notificationId: string | null;
};

type NotificationWriter = {
  notification: PrismaClient["notification"];
};

const reviewSourceStatuses: readonly EstimateStatus[] = [
  EstimateStatus.DRAFT,
  EstimateStatus.AI_REVIEW,
  EstimateStatus.NEEDS_PHOTOS,
  EstimateStatus.NEEDS_HUMAN_REVIEW,
];

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function parseEstimateStatus(value: unknown): EstimateStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  switch (normalized) {
    case EstimateStatus.DRAFT:
      return EstimateStatus.DRAFT;
    case EstimateStatus.AI_REVIEW:
      return EstimateStatus.AI_REVIEW;
    case EstimateStatus.NEEDS_PHOTOS:
      return EstimateStatus.NEEDS_PHOTOS;
    case EstimateStatus.NEEDS_HUMAN_REVIEW:
      return EstimateStatus.NEEDS_HUMAN_REVIEW;
    case EstimateStatus.READY_TO_SEND:
      return EstimateStatus.READY_TO_SEND;
    case EstimateStatus.SENT:
      return EstimateStatus.SENT;
    case EstimateStatus.ACCEPTED:
      return EstimateStatus.ACCEPTED;
    case EstimateStatus.REJECTED:
      return EstimateStatus.REJECTED;
    case EstimateStatus.EXPIRED:
      return EstimateStatus.EXPIRED;
    default:
      return null;
  }
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function isFinalStatus(status: EstimateStatus) {
  return (
    status === EstimateStatus.ACCEPTED ||
    status === EstimateStatus.REJECTED ||
    status === EstimateStatus.EXPIRED
  );
}

function canChangeEstimateStatus(
  currentStatus: EstimateStatus,
  nextStatus: EstimateStatus,
) {
  if (currentStatus === nextStatus) {
    return {
      allowed: true,
      message: "Die Kalkulation hat bereits diesen Status.",
    };
  }

  if (isFinalStatus(currentStatus)) {
    return {
      allowed: false,
      message: `Die Kalkulation hat den finalen Status ${currentStatus} und kann nicht ohne separate Geschäftsaktion geändert werden.`,
    };
  }

  if (nextStatus === EstimateStatus.READY_TO_SEND) {
    return {
      allowed: reviewSourceStatuses.includes(currentStatus),
      message:
        "Nur Entwürfe, KI-Prüfungen, Foto-Anfragen oder interne Prüfungen können freigegeben werden.",
    };
  }

  if (
    nextStatus === EstimateStatus.DRAFT ||
    nextStatus === EstimateStatus.AI_REVIEW ||
    nextStatus === EstimateStatus.NEEDS_PHOTOS ||
    nextStatus === EstimateStatus.NEEDS_HUMAN_REVIEW
  ) {
    return {
      allowed: currentStatus !== EstimateStatus.SENT,
      message:
        "Eine bereits versendete Kalkulation kann nicht in einen Prüfstatus zurückgesetzt werden.",
    };
  }

  if (nextStatus === EstimateStatus.SENT) {
    return {
      allowed: currentStatus === EstimateStatus.READY_TO_SEND,
      message: "Senden ist nur möglich, wenn die Kalkulation bereit ist.",
    };
  }

  if (
    nextStatus === EstimateStatus.ACCEPTED ||
    nextStatus === EstimateStatus.REJECTED
  ) {
    return {
      allowed: currentStatus === EstimateStatus.SENT,
      message:
        "Akzeptieren oder ablehnen ist nur bei einer versendeten Kalkulation möglich.",
    };
  }

  if (nextStatus === EstimateStatus.EXPIRED) {
    return {
      allowed: true,
      message: "Die Kalkulation kann als abgelaufen markiert werden.",
    };
  }

  return {
    allowed: false,
    message: "Diese Statusänderung ist nicht erlaubt.",
  };
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) {
    return "Kunde";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Kunde";
}

function getCustomerRecipient(customer: {
  email: string | null;
  phone: string | null;
} | null) {
  if (!customer) {
    return {
      recipient: null,
      channel: null,
    };
  }

  if (customer.email) {
    return {
      recipient: customer.email,
      channel: NotificationChannel.EMAIL,
    };
  }

  if (customer.phone) {
    return {
      recipient: customer.phone,
      channel: NotificationChannel.SMS,
    };
  }

  return {
    recipient: null,
    channel: null,
  };
}

function buildReadyToSendNotificationMessage(estimate: {
  estimateNumber: string;
  title: string | null;
  total: unknown;
  currency: string;
  customer: {
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
}) {
  const total =
    estimate.total && typeof estimate.total === "object" && "toString" in estimate.total
      ? estimate.total.toString()
      : String(estimate.total ?? "0.00");

  return [
    `Die Kalkulation ${estimate.estimateNumber} wurde intern geprüft und ist bereit für die Angebotserstellung.`,
    "",
    `Kunde: ${customerName(estimate.customer)}`,
    `Titel: ${estimate.title ?? "-"}`,
    `Betrag: ${total} ${estimate.currency}`,
    "",
    "Nächster Schritt: offizielles Angebot erstellen, prüfen und anschließend an den Kunden senden.",
  ].join("\n");
}

async function createReadyToSendNotification(
  tx: NotificationWriter,
  estimate: {
    id: string;
    estimateNumber: string;
    customerId: string;
    orderId: string | null;
    sessionId: string | null;
    title: string | null;
    total: unknown;
    currency: string;
    customer: {
      firstName: string | null;
      lastName: string | null;
      companyName: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  },
): Promise<WorkflowNotificationResult> {
  const { recipient, channel } = getCustomerRecipient(estimate.customer);

  if (!recipient || !channel) {
    return {
      created: false,
      skipped: true,
      reason: "customer_contact_missing",
      notificationId: null,
    };
  }

  const existingNotification = await tx.notification.findFirst({
    where: {
      estimateId: estimate.id,
      channel,
      status: NotificationStatus.PENDING,
      subject: READY_TO_SEND_NOTIFICATION_SUBJECT,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existingNotification) {
    return {
      created: false,
      skipped: true,
      reason: "pending_notification_already_exists",
      notificationId: existingNotification.id,
    };
  }

  const notification = await tx.notification.create({
    data: {
      customerId: estimate.customerId,
      orderId: estimate.orderId,
      estimateId: estimate.id,
      sessionId: estimate.sessionId,
      channel,
      status: NotificationStatus.PENDING,
      recipient,
      subject: READY_TO_SEND_NOTIFICATION_SUBJECT,
      message: buildReadyToSendNotificationMessage(estimate),
      metadata: {
        source: "estimate-workflow",
        workflow: "ready_to_send",
        estimateId: estimate.id,
        estimateNumber: estimate.estimateNumber,
        nextAction: "create_quote",
      },
    },
  });

  return {
    created: true,
    skipped: false,
    reason: null,
    notificationId: notification.id,
  };
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
        order: true,
        session: true,
        items: {
          include: {
            serviceCatalogItem: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        notifications: {
          orderBy: {
            createdAt: "desc",
          },
        },
        attachments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        auditLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Die Kalkulation wurde nicht gefunden.",
            estimate: null,
          },
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate loaded",
        data: {
          status: "success",
          message: "Die Kalkulation wurde geladen.",
          estimate,
        },
      },
      {
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Estimate detail error:", error);

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate detail error",
        data: {
          status: "error",
          message: "Die Kalkulation konnte nicht geladen werden.",
          estimate: null,
        },
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    let body: PatchEstimateBody;

    try {
      body = (await request.json()) as PatchEstimateBody;
    } catch {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Invalid JSON body",
          data: {
            status: "error",
            message: "Der Request enthält kein gültiges JSON.",
            estimate: null,
          },
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const nextStatus = parseEstimateStatus(body.status);

    if (!nextStatus) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Invalid estimate status",
          data: {
            status: "error",
            message: "Der angeforderte Kalkulationsstatus ist ungültig.",
            estimate: null,
          },
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const prisma = getPrisma();

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Die Kalkulation wurde nicht gefunden.",
            estimate: null,
          },
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    const now = new Date();

    if (estimate.status === nextStatus) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Estimate status already set",
          data: {
            status: "success",
            message: "Die Kalkulation hat bereits diesen Status.",
            updated: false,
            notification: {
              created: false,
              skipped: true,
              reason: "status_already_set",
              notificationId: null,
            },
            estimate,
          },
        },
        {
          headers: responseHeaders(),
        },
      );
    }

    const transition = canChangeEstimateStatus(estimate.status, nextStatus);

    if (!transition.allowed) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Estimate status transition blocked",
          data: {
            status: "error",
            message: transition.message,
            currentStatus: estimate.status,
            requestedStatus: nextStatus,
            estimate: null,
          },
        },
        {
          status: 409,
          headers: responseHeaders(),
        },
      );
    }

    if (nextStatus === EstimateStatus.EXPIRED) {
      if (estimate.validUntil && estimate.validUntil > now) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Estimate cannot expire before validUntil",
            data: {
              status: "error",
              message:
                "Die Kalkulation kann nicht vor dem Ablaufdatum als abgelaufen markiert werden.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              validUntil: serializeDate(estimate.validUntil),
              estimate: null,
            },
          },
          {
            status: 409,
            headers: responseHeaders(),
          },
        );
      }
    }

    const before = {
      status: estimate.status,
      sentAt: serializeDate(estimate.sentAt),
      acceptedAt: serializeDate(estimate.acceptedAt),
      rejectedAt: serializeDate(estimate.rejectedAt),
    };

    const updateData: {
      status: EstimateStatus;
      sentAt?: Date;
      acceptedAt?: Date;
      rejectedAt?: Date;
    } = {
      status: nextStatus,
    };

    if (nextStatus === EstimateStatus.SENT) {
      updateData.sentAt = estimate.sentAt ?? now;
    }

    if (nextStatus === EstimateStatus.ACCEPTED) {
      updateData.sentAt = estimate.sentAt ?? now;
      updateData.acceptedAt = estimate.acceptedAt ?? now;
    }

    if (nextStatus === EstimateStatus.REJECTED) {
      updateData.rejectedAt = estimate.rejectedAt ?? now;
    }

    const result = await prisma.$transaction(async (tx) => {
      const changedEstimate = await tx.estimate.update({
        where: {
          id: estimate.id,
        },
        data: updateData,
        include: {
          customer: true,
          order: true,
          session: true,
          items: {
            include: {
              serviceCatalogItem: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
          notifications: {
            orderBy: {
              createdAt: "desc",
            },
          },
          attachments: {
            orderBy: {
              createdAt: "desc",
            },
          },
          auditLogs: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      let notification: WorkflowNotificationResult = {
        created: false,
        skipped: true,
        reason: "not_ready_to_send_workflow",
        notificationId: null,
      };

      if (nextStatus === EstimateStatus.READY_TO_SEND) {
        notification = await createReadyToSendNotification(tx, {
          id: estimate.id,
          estimateNumber: estimate.estimateNumber,
          customerId: estimate.customerId,
          orderId: estimate.orderId,
          sessionId: estimate.sessionId,
          title: estimate.title,
          total: estimate.total,
          currency: estimate.currency,
          customer: estimate.customer,
        });
      }

      await tx.auditLog.create({
        data: {
          customerId: estimate.customerId,
          orderId: estimate.orderId,
          estimateId: estimate.id,
          sessionId: estimate.sessionId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "Estimate",
          entityId: estimate.id,
          actorType: "dashboard",
          before,
          after: {
            status: changedEstimate.status,
            sentAt: serializeDate(changedEstimate.sentAt),
            acceptedAt: serializeDate(changedEstimate.acceptedAt),
            rejectedAt: serializeDate(changedEstimate.rejectedAt),
          },
          message: `Kalkulation ${estimate.estimateNumber}: Status von ${estimate.status} auf ${changedEstimate.status} geändert.`,
          metadata: {
            source: "estimate-detail-api",
            estimateId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            previousStatus: estimate.status,
            nextStatus: changedEstimate.status,
            workflowNotificationCreated: notification.created,
            workflowNotificationSkipped: notification.skipped,
            workflowNotificationReason: notification.reason,
            workflowNotificationId: notification.notificationId,
          },
        },
      });

      return {
        estimate: changedEstimate,
        notification,
      };
    });

    const readyMessage =
      nextStatus === EstimateStatus.READY_TO_SEND
        ? result.notification.created
          ? "Die Kalkulation wurde freigegeben. Eine ausstehende Kundenbenachrichtigung wurde vorbereitet."
          : result.notification.reason === "pending_notification_already_exists"
            ? "Die Kalkulation wurde freigegeben. Eine ausstehende Kundenbenachrichtigung existiert bereits."
            : result.notification.reason === "customer_contact_missing"
              ? "Die Kalkulation wurde freigegeben. Es wurde keine Kundenbenachrichtigung erstellt, weil kein Kontakt vorhanden ist."
              : "Die Kalkulation wurde freigegeben."
        : "Der Status der Kalkulation wurde geändert.";

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate status updated",
        data: {
          status: "success",
          message: readyMessage,
          updated: true,
          notification: result.notification,
          estimate: result.estimate,
        },
      },
      {
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Estimate update error:", error);

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate update error",
        data: {
          status: "error",
          message: "Der Status der Kalkulation konnte nicht geändert werden.",
          estimate: null,
        },
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}