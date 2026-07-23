import {
  PrismaClient,
} from "@prisma/client";
import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  calculateCentralPrice,
} from "./engine";
import type {
  CentralPricingCatalogItem,
  CentralPricingInput,
} from "./types";

const TENANT_KEY =
  "hexa-clean";

const globalForPricing =
  globalThis as unknown as {
    hexaCentralPricingPrisma?:
      PrismaClient;
  };

function getPrisma() {
  if (
    !globalForPricing
      .hexaCentralPricingPrisma
  ) {
    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is missing",
      );
    }

    globalForPricing
      .hexaCentralPricingPrisma =
        new PrismaClient({
          adapter: new PrismaPg({
            connectionString:
              databaseUrl,
          }),
        });
  }

  return globalForPricing
    .hexaCentralPricingPrisma;
}

function decimalToNumber(
  value: {
    toString(): string;
  } | null,
) {
  if (value === null) {
    return null;
  }

  const parsed =
    Number(value.toString());

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export async function getActivePricingCatalog():
Promise<CentralPricingCatalogItem[]> {
  const prisma = getPrisma();

  const items =
    await prisma
      .serviceCatalogItem
      .findMany({
        where: {
          tenantKey: TENANT_KEY,
          isActive: true,
        },
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          unit: true,
          basePrice: true,
          minPrice: true,
          maxPrice: true,
          defaultQuantity: true,
          riskMultiplier: true,
        },
      });

  return items.map(
    (item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      category:
        String(item.category),
      unit: String(item.unit),
      basePrice:
        decimalToNumber(
          item.basePrice,
        ) ?? 0,
      minPrice:
        decimalToNumber(
          item.minPrice,
        ) ?? 0,
      maxPrice:
        decimalToNumber(
          item.maxPrice,
        ),
      defaultQuantity:
        decimalToNumber(
          item.defaultQuantity,
        ),
      riskMultiplier:
        decimalToNumber(
          item.riskMultiplier,
        ) ?? 1,
    }),
  );
}

export async function calculateServerPrice(
  input: CentralPricingInput,
) {
  const catalog =
    await getActivePricingCatalog();

  return calculateCentralPrice(
    catalog,
    input,
  );
}
