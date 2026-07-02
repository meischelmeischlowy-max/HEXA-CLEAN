import {
  PrismaClient,
  ServiceCatalogCategory,
  ServiceCatalogUnit,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDecimal(value: unknown, fallback = "0.00") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return number.toFixed(2);
}

function normalizeNullableDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);

  if (Number.isNaN(number)) {
    return null;
  }

  return number.toFixed(2);
}

function normalizeInt(value: unknown, fallback = 0) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return Math.trunc(number);
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function isCategory(value: unknown): value is ServiceCatalogCategory {
  return Object.values(ServiceCatalogCategory).includes(
    value as ServiceCatalogCategory
  );
}

function isUnit(value: unknown): value is ServiceCatalogUnit {
  return Object.values(ServiceCatalogUnit).includes(value as ServiceCatalogUnit);
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;
    const prisma = getPrisma();

    const service = await prisma.serviceCatalogItem.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          layer: "service-catalog-details-api",
          message: "Service not found",
          data: {
            status: "error",
            message: "Service not found",
            service: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      layer: "service-catalog-details-api",
      message: "Service loaded",
      data: {
        status: "success",
        message: "Service loaded",
        service,
      },
    });
  } catch (error) {
    console.error("Service Catalog details API error:", error);

    return NextResponse.json(
      {
        layer: "service-catalog-details-api",
        message: "Service Catalog details API error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown service catalog details error",
          service: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;
    const prisma = getPrisma();

    const body = (await request.json()) as Record<string, unknown>;

    const current = await prisma.serviceCatalogItem.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
    });

    if (!current) {
      return NextResponse.json(
        {
          layer: "service-catalog-update-api",
          message: "Service not found",
          data: {
            status: "error",
            message: "Service not found",
            service: null,
          },
        },
        {
          status: 404,
        }
      );
    }

    const name = String(body.name ?? current.name).trim();

    if (!name) {
      return NextResponse.json(
        {
          layer: "service-catalog-update-api",
          message: "Service name is required",
          data: {
            status: "error",
            message: "Nazwa usługi jest wymagana.",
            service: null,
          },
        },
        {
          status: 400,
        }
      );
    }

    const slugSource = String(body.slug ?? current.slug ?? name).trim() || name;

    const service = await prisma.serviceCatalogItem.update({
      where: {
        id: current.id,
      },
      data: {
        name,
        slug: slugify(slugSource),
        description: String(body.description ?? "").trim() || null,
        category: isCategory(body.category) ? body.category : current.category,
        unit: isUnit(body.unit) ? body.unit : current.unit,
        basePrice: normalizeDecimal(body.basePrice, String(current.basePrice)),
        minPrice: normalizeDecimal(body.minPrice, String(current.minPrice)),
        maxPrice: normalizeNullableDecimal(body.maxPrice),
        defaultQuantity: normalizeNullableDecimal(body.defaultQuantity),
        riskMultiplier: normalizeDecimal(
          body.riskMultiplier,
          String(current.riskMultiplier)
        ),
        isActive: normalizeBoolean(body.isActive, current.isActive),
        sortOrder: normalizeInt(body.sortOrder, current.sortOrder),
        notes: String(body.notes ?? "").trim() || null,
      },
    });

    return NextResponse.json({
      layer: "service-catalog-update-api",
      message: "Service updated",
      data: {
        status: "success",
        message: "Service updated",
        service,
      },
    });
  } catch (error) {
    console.error("Service Catalog PATCH error:", error);

    return NextResponse.json(
      {
        layer: "service-catalog-update-api",
        message: "Service Catalog PATCH error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown service catalog update error",
          service: null,
        },
      },
      {
        status: 500,
      }
    );
  }
}