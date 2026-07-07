import { EstimateStatus, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PatchEstimateBody = {
  status?: unknown;
};

const reviewStatuses: readonly EstimateStatus[] = [
  EstimateStatus.DRAFT,
  EstimateStatus.AI_REVIEW,
  EstimateStatus.NEEDS_PHOTOS,
  EstimateStatus.NEEDS_HUMAN_REVIEW,
  EstimateStatus.READY_TO_SEND,
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

function canMoveToReviewStatus(currentStatus: EstimateStatus) {
  return !isFinalStatus(currentStatus);
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
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
            message: "Nie znaleziono wyceny.",
            estimate: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      layer: "estimate-detail-api",
      message: "Estimate loaded",
      data: {
        status: "success",
        message: "Wycena została załadowana.",
        estimate,
      },
    });
  } catch (error) {
    console.error("Estimate detail error:", error);

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate detail error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown estimate detail error",
          estimate: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
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
            message: "Nieprawidłowy JSON w żądaniu.",
            estimate: null,
          },
        },
        {
          status: 400,
        }
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
            message: "Nieprawidłowy status wyceny.",
            estimate: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const prisma = getPrisma();

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Nie znaleziono wyceny.",
            estimate: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    const now = new Date();

    if (estimate.status === nextStatus) {
      return NextResponse.json({
        layer: "estimate-detail-api",
        message: "Estimate status already set",
        data: {
          status: "success",
          message: "Wycena ma już ten status.",
          updated: false,
          estimate,
        },
      });
    }

    if (isFinalStatus(estimate.status)) {
      return NextResponse.json(
        {
          layer: "estimate-detail-api",
          message: "Final estimate status cannot be changed",
          data: {
            status: "error",
            message: `Wycena ma status końcowy ${estimate.status} i nie może być cofnięta bez osobnej akcji biznesowej.`,
            currentStatus: estimate.status,
            requestedStatus: nextStatus,
            estimate: null,
          },
        },
        {
          status: 409,
        }
      );
    }

    if (reviewStatuses.includes(nextStatus)) {
      if (!canMoveToReviewStatus(estimate.status)) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Estimate cannot move to review status",
            data: {
              status: "error",
              message: "Nie można cofnąć statusu końcowego wyceny.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              estimate: null,
            },
          },
          {
            status: 409,
          }
        );
      }
    }

    if (nextStatus === EstimateStatus.SENT) {
      if (estimate.status !== EstimateStatus.READY_TO_SEND) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Only ready estimate can be sent",
            data: {
              status: "error",
              message: "Wysłać można tylko wycenę gotową do wysłania.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              estimate: null,
            },
          },
          {
            status: 409,
          }
        );
      }
    }

    if (nextStatus === EstimateStatus.ACCEPTED) {
      if (estimate.status !== EstimateStatus.SENT) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Only sent estimate can be accepted",
            data: {
              status: "error",
              message: "Zaakceptować można tylko wysłaną wycenę.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              estimate: null,
            },
          },
          {
            status: 409,
          }
        );
      }
    }

    if (nextStatus === EstimateStatus.REJECTED) {
      if (estimate.status !== EstimateStatus.SENT) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Only sent estimate can be rejected",
            data: {
              status: "error",
              message: "Odrzucić można tylko wysłaną wycenę.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              estimate: null,
            },
          },
          {
            status: 409,
          }
        );
      }
    }

    if (nextStatus === EstimateStatus.EXPIRED) {
      if (estimate.validUntil && estimate.validUntil > now) {
        return NextResponse.json(
          {
            layer: "estimate-detail-api",
            message: "Estimate cannot expire before validUntil",
            data: {
              status: "error",
              message: "Wycena nie może wygasnąć przed datą validUntil.",
              currentStatus: estimate.status,
              requestedStatus: nextStatus,
              validUntil: serializeDate(estimate.validUntil),
              estimate: null,
            },
          },
          {
            status: 409,
          }
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

    const updatedEstimate = await prisma.$transaction(async (tx) => {
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

      await tx.auditLog.create({
        data: {
          customerId: estimate.customerId,
          orderId: estimate.orderId,
          estimateId: estimate.id,
          sessionId: estimate.sessionId,
          action: "STATUS_CHANGE",
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
          message: `Estimate ${estimate.estimateNumber} status changed from ${estimate.status} to ${changedEstimate.status}.`,
          metadata: {
            source: "estimate-detail-api",
            estimateId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            previousStatus: estimate.status,
            nextStatus: changedEstimate.status,
          },
        },
      });

      return changedEstimate;
    });

    return NextResponse.json({
      layer: "estimate-detail-api",
      message: "Estimate status updated",
      data: {
        status: "success",
        message: "Status wyceny został zmieniony.",
        updated: true,
        estimate: updatedEstimate,
      },
    });
  } catch (error) {
    console.error("Estimate update error:", error);

    return NextResponse.json(
      {
        layer: "estimate-detail-api",
        message: "Estimate update error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown estimate update error",
          estimate: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}