import {
  AvailabilitySlotStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import type {
  OnlineBeraterBusinessContext,
} from "./types";

const globalForPrisma = globalThis as unknown as {
  onlineBeraterPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.onlineBeraterPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.onlineBeraterPrisma =
      new PrismaClient({
        adapter: new PrismaPg({
          connectionString: databaseUrl,
        }),
      });
  }

  return globalForPrisma.onlineBeraterPrisma;
}

function decimalToNumber(
  value: unknown,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export async function getOnlineBeraterBusinessContext(): Promise<OnlineBeraterBusinessContext> {
  const prisma = getPrisma();
  const now = new Date();

  const [
    services,
    availability,
  ] = await Promise.all([
    prisma.serviceCatalogItem.findMany({
      where: {
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
        description: true,
        category: true,
        unit: true,
        basePrice: true,
        minPrice: true,
        maxPrice: true,
      },
    }),

    prisma.availabilitySlot.findMany({
      where: {
        status:
          AvailabilitySlotStatus.AVAILABLE,
        startAt: {
          gte: now,
        },
      },
      orderBy: {
        startAt: "asc",
      },
      take: 20,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        notes: true,
      },
    }),
  ]);

  return {
    company: {
      name: "HEXA CLEAN",
      email: "info@hexaclean.ch",
      phone: "+41 76 258 19 48",
      location:
        "Pieterlen, Biel/Bienne, Schweiz",
      openingHours: {
        weekdays:
          "Montag bis Freitag, 08:00 bis 18:00",
        saturday:
          "Nach Vereinbarung",
        sunday:
          "Geschlossen",
      },
    },
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      description:
        service.description,
      category:
        String(service.category),
      unit:
        String(service.unit),
      basePrice:
        decimalToNumber(
          service.basePrice,
        ),
      minPrice:
        decimalToNumber(
          service.minPrice,
        ),
      maxPrice:
        service.maxPrice === null
          ? null
          : decimalToNumber(
              service.maxPrice,
            ),
    })),
    availability:
      availability.map((slot) => ({
        id: slot.id,
        startsAt:
          slot.startAt.toISOString(),
        endsAt:
          slot.endAt.toISOString(),
        label: slot.notes,
      })),
    generatedAt:
      now.toISOString(),
  };
}
