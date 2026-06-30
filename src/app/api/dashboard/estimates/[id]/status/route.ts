import { PrismaClient, EstimateStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const allowedStatuses: readonly EstimateStatus[] = [
  "DRAFT",
  "AI_REVIEW",
  "NEEDS_PHOTOS",
  "NEEDS_HUMAN_REVIEW",
  "READY_TO_SEND",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type UpdateStatusBody = {
  status?: EstimateStatus;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
    });
  }

  return globalForPrisma.hexaPrisma;
}

async function readBody(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as UpdateStatusBody;
  } catch {
    return null;
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
    const body = await readBody(request);
    const nextStatus = body?.status;

    if (!nextStatus || !allowedStatuses.includes(nextStatus)) {
      return NextResponse.json(
        {
          layer: "estimate-status-api",
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

    const existingEstimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
      },
    });

    if (!existingEstimate) {
      return NextResponse.json(
        {
          layer: "estimate-status-api",
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

    const updatedEstimate = await prisma.estimate.update({
      where: {
        id,
      },
      data: {
        status: nextStatus,
        auditLogs: {
          create: {
            customerId: existingEstimate.customerId,
            action: "UPDATE",
            entityType: "Estimate",
            actorType: "admin",
            message: `Estimate status changed from ${existingEstimate.status} to ${nextStatus}.`,
            before: {
              status: existingEstimate.status,
            },
            after: {
              status: nextStatus,
            },
            metadata: {
              source: "estimate-status-api",
            },
          },
        },
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
        notifications: true,
        auditLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({
      layer: "estimate-status-api",
      message: "Estimate status updated",
      data: {
        status: "success",
        message: "Status wyceny został zmieniony.",
        estimate: updatedEstimate,
      },
    });
  } catch (error) {
    console.error("Estimate status update error:", error);

    return NextResponse.json(
      {
        layer: "estimate-status-api",
        message: "Estimate status update error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown estimate status update error",
          estimate: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}