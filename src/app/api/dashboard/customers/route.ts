import { PrismaClient } from "@prisma/client";
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

function cleanCustomerType(value: unknown) {
  const raw = String(value ?? "PRIVATE").trim().toUpperCase();
  return raw === "COMPANY" ? "COMPANY" : "PRIVATE";
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

    return NextResponse.json({
      layer: "dashboard-api",
      message: "Dashboard customers works",
      data: {
        status: "OK",
        message: "Customers loaded",
        customers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        layer: "dashboard-api",
        message: "Dashboard customers failed",
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

    const customer = await prisma.customer.create({
      data: {
        type: cleanCustomerType(body.type),
        firstName: cleanText(body.firstName),
        lastName: cleanText(body.lastName),
        companyName: cleanText(body.companyName),
        email: cleanText(body.email),
        phone: cleanText(body.phone),
        street: cleanText(body.street),
        zipCode: cleanText(body.zipCode),
        city: cleanText(body.city),
        country: cleanText(body.country) ?? "CH",
        notes: cleanText(body.notes),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "Customer",
        entityId: customer.id,
        message: `Utworzono klienta: ${customer.companyName || customer.email || customer.phone || customer.id}`,
      },
    });

    return NextResponse.json(
      {
        status: "OK",
        message: "Customer created",
        data: {
          customer,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to create customer",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}