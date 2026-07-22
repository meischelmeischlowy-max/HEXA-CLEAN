import { OrderStatus, PrismaClient, ServiceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
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

function cleanCustomerType(value: unknown) {
  const raw = String(value ?? "PRIVATE").trim().toUpperCase();
  return raw === "COMPANY" ? "COMPANY" : "PRIVATE";
}

function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `JOB-${date}-${random}`;
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        estimates: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
      take: 500,
    });

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard orders works",
      data: {
        status: "OK",
        message: "Orders loaded",
        orders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard orders failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const prisma = getPrisma();
    const body = await request.json();

    const serviceType = cleanServiceType(body.serviceType);
    const title = cleanText(body.title);

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

    let customerId = cleanText(body.customerId);

    if (!customerId) {
      const companyName = cleanText(body.customerCompanyName);
      const firstName = cleanText(body.customerFirstName);
      const lastName = cleanText(body.customerLastName);
      const email = cleanText(body.customerEmail);
      const phone = cleanText(body.customerPhone);

      if (!companyName && !firstName && !lastName && !email && !phone) {
        return NextResponse.json(
          {
            status: "ERROR",
            message: "Customer data is required",
            error: "Wpisz przynajmniej nazwÄ™ firmy, imiÄ™, nazwisko, email albo telefon klienta.",
          },
          { status: 400 },
        );
      }

      const customer = await prisma.customer.create({
        data: {
          type: cleanCustomerType(body.customerType),
          companyName,
          firstName,
          lastName,
          email,
          phone,
          country: "CH",
          notes: cleanText(body.customerNotes),
        },
      });

      customerId = customer.id;

      await prisma.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Customer",
          entityId: customer.id,
          customerId: customer.id,
          message: `Utworzono klienta ze zlecenia: ${customer.companyName || customer.email || customer.phone || customer.id}`,
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        orderNumber: cleanText(body.orderNumber) ?? generateOrderNumber(),
        status: OrderStatus.NEW,
        title,
        description: cleanText(body.description),
        serviceType,
        scheduledStart: parseDate(body.scheduledStart ?? body.scheduledAt),
        currency: normalizeCurrency(body.currency),
        estimatedPrice: cleanMoney(body.estimatedPrice),
        finalPrice: cleanMoney(body.finalPrice),
      },
      include: {
        customer: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "Order",
        entityId: order.id,
        customerId: order.customerId,
        message: `Utworzono zlecenie: ${order.orderNumber}`,
      },
    });

    return NextResponse.json(
      {
        status: "OK",
        message: "Order created",
        data: {
          order,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}