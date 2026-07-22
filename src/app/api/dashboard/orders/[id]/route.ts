import {
  OrderStatus,
  PrismaClient,
  ServiceType,
  type Prisma,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function cleanMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function cleanStatus(value: unknown): OrderStatus {
  const raw = String(value ?? OrderStatus.NEW).trim().toUpperCase();

  if (Object.values(OrderStatus).includes(raw as OrderStatus)) {
    return raw as OrderStatus;
  }

  return OrderStatus.NEW;
}

function cleanServiceType(value: unknown): ServiceType | null {
  const raw = cleanText(value)?.toUpperCase();

  if (!raw) {
    return null;
  }

  if (Object.values(ServiceType).includes(raw as ServiceType)) {
    return raw as ServiceType;
  }

  return null;
}

function normalizeCurrency(value: unknown) {
  const raw = String(value || "CHF").trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(raw)) return raw;
  if (raw.startsWith("CHF")) return "CHF";
  if (raw.startsWith("EUR")) return "EUR";
  if (raw.startsWith("USD")) return "USD";
  if (raw.startsWith("PLN")) return "PLN";

  return "CHF";
}

function parseDate(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        estimates: {
          orderBy: {
            createdAt: "desc",
          },
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Order not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "OK",
      message: "Order loaded",
      data: {
        order,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to load order details",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();
    const body = await request.json();

    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Order not found",
        },
        { status: 404 },
      );
    }

    const serviceType = cleanServiceType(body.serviceType);

    if (!serviceType) {
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Service type is required",
          error: "Wybierz poprawny typ usĹ‚ugi dla zlecenia.",
        },
        { status: 400 },
      );
    }

    const updateData: Prisma.OrderUpdateInput = {
      orderNumber: cleanText(body.orderNumber) ?? existingOrder.orderNumber,
title: cleanText(body.title),
      description: cleanText(body.description),
      serviceType,
      scheduledStart: parseDate(body.scheduledStart ?? body.scheduledAt),
      currency: normalizeCurrency(body.currency),
      estimatedPrice: cleanMoney(body.estimatedPrice),
      finalPrice: cleanMoney(body.finalPrice),
    };

    const customerId = cleanText(body.customerId);

    if (customerId) {
      updateData.customer = {
        connect: {
          id: customerId,
        },
      };
    }

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: updateData,
      include: {
        customer: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "Order",
        entityId: order.id,
        customerId: order.customerId,
        message: `Zaktualizowano zlecenie: ${order.orderNumber}`,
      },
    });

    return NextResponse.json({
      status: "OK",
      message: "Order updated",
      data: {
        order,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to update order",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}