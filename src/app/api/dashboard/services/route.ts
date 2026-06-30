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

export async function GET() {
  try {
    const prisma = getPrisma();

    const services = await prisma.serviceCatalogItem.findMany({
      where: {
        tenantKey: "hexa-clean",
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      layer: "service-catalog-api",
      message: "Service Catalog API works",
      data: {
        status: "success",
        message: "Services loaded",
        services,
      },
    });
  } catch (error) {
    console.error("Service Catalog API error:", error);

    return NextResponse.json(
      {
        layer: "service-catalog-api",
        message: "Service Catalog API error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown service catalog error",
          services: [],
        },
      },
      {
        status: 500,
      }
    );
  }
}