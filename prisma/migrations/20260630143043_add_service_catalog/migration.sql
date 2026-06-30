-- CreateEnum
CREATE TYPE "ServiceCatalogCategory" AS ENUM ('REINIGUNG', 'HAUSWARTUNG', 'KLEINREPARATUREN', 'UMZUGSREINIGUNG', 'FENSTERREINIGUNG', 'WOHNUNGSABGABE', 'SPEZIALREINIGUNG', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceCatalogUnit" AS ENUM ('FLAT', 'HOUR', 'M2', 'ROOM', 'WINDOW', 'PIECE', 'KM', 'CUSTOM');

-- CreateTable
CREATE TABLE "service_catalog_items" (
    "id" UUID NOT NULL,
    "tenantKey" TEXT NOT NULL DEFAULT 'hexa-clean',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCatalogCategory" NOT NULL,
    "unit" "ServiceCatalogUnit" NOT NULL DEFAULT 'FLAT',
    "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxPrice" DECIMAL(10,2),
    "defaultQuantity" DECIMAL(10,2),
    "riskMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_catalog_items_tenantKey_idx" ON "service_catalog_items"("tenantKey");

-- CreateIndex
CREATE INDEX "service_catalog_items_category_idx" ON "service_catalog_items"("category");

-- CreateIndex
CREATE INDEX "service_catalog_items_isActive_idx" ON "service_catalog_items"("isActive");

-- CreateIndex
CREATE INDEX "service_catalog_items_sortOrder_idx" ON "service_catalog_items"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_items_tenantKey_slug_key" ON "service_catalog_items"("tenantKey", "slug");
