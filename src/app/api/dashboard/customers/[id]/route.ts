import { PrismaClient } from "@prisma/client";
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

function cleanCustomerType(value: unknown) {
  const raw = String(value ?? "PRIVATE").trim().toUpperCase();
  return raw === "COMPANY" ? "COMPANY" : "PRIVATE";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const customer = await prisma.customer.findUnique({
      where: {
        id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Customer not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "OK",
      message: "Customer loaded",
      data: {
        customer,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to load customer details",
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

    const existingCustomer = await prisma.customer.findUnique({
      where: {
        id,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Customer not found",
        },
        { status: 404 },
      );
    }

    const customer = await prisma.customer.update({
      where: {
        id,
      },
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
        action: "UPDATE",
        entityType: "Customer",
        entityId: customer.id,
        message: `Zaktualizowano klienta: ${customer.companyName || customer.email || customer.phone || customer.id}`,
      },
    });

    return NextResponse.json({
      status: "OK",
      message: "Customer updated",
      data: {
        customer,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "Failed to update customer",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}