import {
  AuditAction,
  OrderStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

function parseRequiredDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseOptionalDate(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return parseRequiredDate(value);
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const scheduledStart =
      parseRequiredDate(body.scheduledStart);

    const scheduledEnd =
      parseOptionalDate(body.scheduledEnd);

    if (!scheduledStart) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Ein gültiger Starttermin ist erforderlich.",
        },
        { status: 400 },
      );
    }

    if (
      scheduledEnd &&
      scheduledEnd.getTime() <=
        scheduledStart.getTime()
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Der Endtermin muss nach dem Starttermin liegen.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const existingOrder =
      await prisma.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          sessionId: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
        },
      });

    if (!existingOrder) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Auftrag nicht gefunden.",
        },
        { status: 404 },
      );
    }

    if (
      existingOrder.status !==
        OrderStatus.CONFIRMED &&
      existingOrder.status !==
        OrderStatus.SCHEDULED
    ) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Nur ein bestätigter Auftrag kann geplant werden.",
          currentStatus:
            existingOrder.status,
          requiredStatus:
            OrderStatus.CONFIRMED,
        },
        { status: 409 },
      );
    }

    const order =
      await prisma.$transaction(
        async (tx) => {
          const updatedOrder =
            await tx.order.update({
              where: { id },
              data: {
                status:
                  OrderStatus.SCHEDULED,
                scheduledStart,
                scheduledEnd,
              },
              select: {
                id: true,
                orderNumber: true,
                customerId: true,
                sessionId: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
              },
            });

          await tx.auditLog.create({
            data: {
              action:
                AuditAction.STATUS_CHANGE,
              entityType: "Order",
              entityId: updatedOrder.id,
              customerId:
                updatedOrder.customerId,
              orderId: updatedOrder.id,
              sessionId:
                updatedOrder.sessionId,
              actorType:
                "dashboard_owner",
              before: {
                status:
                  existingOrder.status,
                scheduledStart:
                  existingOrder
                    .scheduledStart
                    ?.toISOString() ??
                  null,
                scheduledEnd:
                  existingOrder
                    .scheduledEnd
                    ?.toISOString() ??
                  null,
              },
              after: {
                status:
                  updatedOrder.status,
                scheduledStart:
                  updatedOrder
                    .scheduledStart
                    ?.toISOString() ??
                  null,
                scheduledEnd:
                  updatedOrder
                    .scheduledEnd
                    ?.toISOString() ??
                  null,
              },
              message:
                `Termin für Auftrag ${updatedOrder.orderNumber} wurde geplant.`,
              metadata: {
                source:
                  "dashboard_order_scheduling",
                automationFirst: true,
              },
            },
          });

          return updatedOrder;
        },
      );

    return NextResponse.json({
      status: "OK",
      message:
        "Der Auftrag wurde eingeplant.",
      data: { order },
    });
  } catch (error) {
    console.error(
      "Order scheduling error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Der Auftrag konnte nicht eingeplant werden.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
