import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

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

const demoServices = [
  {
    name: "Sprzątanie mieszkania",
    slug: "sprzatanie-mieszkania",
    description:
      "Standardowe sprzątanie mieszkania: podłogi, kurze, kuchnia, łazienka i podstawowe powierzchnie.",
    category: "REINIGUNG" as const,
    unit: "M2" as const,
    basePrice: "3.50",
    minPrice: "120.00",
    maxPrice: null,
    defaultQuantity: "60.00",
    riskMultiplier: "1.00",
    sortOrder: 10,
    notes: "Cena robocza demo. Finalna cena zależy od zakresu i stanu mieszkania.",
  },
  {
    name: "Endreinigung / oddanie mieszkania",
    slug: "endreinigung-oddanie-mieszkania",
    description:
      "Dokładne sprzątanie końcowe przed oddaniem mieszkania, z kontrolą kuchni, łazienki i powierzchni trudnych.",
    category: "WOHNUNGSABGABE" as const,
    unit: "M2" as const,
    basePrice: "5.50",
    minPrice: "280.00",
    maxPrice: null,
    defaultQuantity: "70.00",
    riskMultiplier: "1.25",
    sortOrder: 20,
    notes: "Wymaga zdjęć albo kontroli przy mocnym zabrudzeniu.",
  },
  {
    name: "Mycie okien",
    slug: "mycie-okien",
    description:
      "Mycie okien standardowych. Cena liczona od sztuki albo zestawu okiennego.",
    category: "FENSTERREINIGUNG" as const,
    unit: "WINDOW" as const,
    basePrice: "18.00",
    minPrice: "90.00",
    maxPrice: null,
    defaultQuantity: "6.00",
    riskMultiplier: "1.10",
    sortOrder: 30,
    notes: "Dodatkowa dopłata możliwa przy dużych oknach, wysokości albo silnym zabrudzeniu.",
  },
  {
    name: "Sprzątanie biura",
    slug: "sprzatanie-biura",
    description:
      "Regularne lub jednorazowe sprzątanie powierzchni biurowej.",
    category: "REINIGUNG" as const,
    unit: "HOUR" as const,
    basePrice: "45.00",
    minPrice: "120.00",
    maxPrice: null,
    defaultQuantity: "3.00",
    riskMultiplier: "1.00",
    sortOrder: 40,
    notes: "Cena zależy od częstotliwości i godzin pracy.",
  },
  {
    name: "Hauswartung / utrzymanie obiektu",
    slug: "hauswartung-utrzymanie-obiektu",
    description:
      "Podstawowe prace porządkowe i techniczne wokół budynku: zamiatanie, odpady, kontrola części wspólnych.",
    category: "HAUSWARTUNG" as const,
    unit: "HOUR" as const,
    basePrice: "55.00",
    minPrice: "150.00",
    maxPrice: null,
    defaultQuantity: "3.00",
    riskMultiplier: "1.00",
    sortOrder: 50,
    notes: "Docelowo możliwe pakiety miesięczne.",
  },
  {
    name: "Małe naprawy",
    slug: "male-naprawy",
    description:
      "Drobne prace techniczne: montaż, regulacje, proste naprawy, wymiana drobnych elementów.",
    category: "KLEINREPARATUREN" as const,
    unit: "HOUR" as const,
    basePrice: "65.00",
    minPrice: "120.00",
    maxPrice: null,
    defaultQuantity: "2.00",
    riskMultiplier: "1.15",
    sortOrder: 60,
    notes: "Materiały i dojazd mogą być doliczane osobno.",
  },
  {
    name: "Dojazd",
    slug: "dojazd",
    description:
      "Koszt dojazdu do klienta, liczony ryczałtowo albo później według kilometrów.",
    category: "OTHER" as const,
    unit: "FLAT" as const,
    basePrice: "35.00",
    minPrice: "0.00",
    maxPrice: null,
    defaultQuantity: "1.00",
    riskMultiplier: "1.00",
    sortOrder: 70,
    notes: "Pozycja pomocnicza do wyceny.",
  },
  {
    name: "Czyszczenie specjalne",
    slug: "czyszczenie-specjalne",
    description:
      "Trudne zabrudzenia, tłuszcz, kamień, fugi, zapuszczone powierzchnie lub nietypowy zakres.",
    category: "SPEZIALREINIGUNG" as const,
    unit: "CUSTOM" as const,
    basePrice: "0.00",
    minPrice: "250.00",
    maxPrice: null,
    defaultQuantity: null,
    riskMultiplier: "1.60",
    sortOrder: 80,
    notes: "Wymaga zdjęć i ręcznej wyceny przed wysłaniem ceny klientowi.",
  },
];

export async function GET() {
  try {
    const prisma = getPrisma();

    const services = await prisma.serviceCatalogItem.findMany({
      where: {
        tenantKey: TENANT_KEY,
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

export async function POST() {
  try {
    const prisma = getPrisma();

    const services = await Promise.all(
      demoServices.map((service) =>
        prisma.serviceCatalogItem.upsert({
          where: {
            tenantKey_slug: {
              tenantKey: TENANT_KEY,
              slug: service.slug,
            },
          },
          update: {
            name: service.name,
            description: service.description,
            category: service.category,
            unit: service.unit,
            basePrice: service.basePrice,
            minPrice: service.minPrice,
            maxPrice: service.maxPrice,
            defaultQuantity: service.defaultQuantity,
            riskMultiplier: service.riskMultiplier,
            isActive: true,
            sortOrder: service.sortOrder,
            notes: service.notes,
          },
          create: {
            tenantKey: TENANT_KEY,
            name: service.name,
            slug: service.slug,
            description: service.description,
            category: service.category,
            unit: service.unit,
            basePrice: service.basePrice,
            minPrice: service.minPrice,
            maxPrice: service.maxPrice,
            defaultQuantity: service.defaultQuantity,
            riskMultiplier: service.riskMultiplier,
            isActive: true,
            sortOrder: service.sortOrder,
            notes: service.notes,
          },
        })
      )
    );

    return NextResponse.json({
      layer: "service-catalog-api",
      message: "Demo services seeded",
      data: {
        status: "success",
        message: "Demo service catalog created or updated",
        services,
      },
    });
  } catch (error) {
    console.error("Service Catalog seed error:", error);

    return NextResponse.json(
      {
        layer: "service-catalog-api",
        message: "Service Catalog seed error",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown service catalog seed error",
          services: [],
        },
      },
      {
        status: 500,
      }
    );
  }
}