-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'AI_REVIEW', 'NEEDS_PHOTOS', 'NEEDS_HUMAN_REVIEW', 'READY_TO_SEND', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "estimateId" UUID;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "estimateId" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "estimateId" UUID;

-- CreateTable
CREATE TABLE "estimates" (
    "id" UUID NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "tenantKey" TEXT NOT NULL DEFAULT 'hexa-clean',
    "customerId" UUID NOT NULL,
    "orderId" UUID,
    "sessionId" UUID,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT,
    "title" TEXT,
    "description" TEXT,
    "serviceStreet" TEXT,
    "serviceZipCode" TEXT,
    "serviceCity" TEXT,
    "serviceCountry" TEXT DEFAULT 'CH',
    "preferredDate" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "riskMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "riskAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "travelFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "materialFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "aiMinTotal" DECIMAL(10,2),
    "aiMaxTotal" DECIMAL(10,2),
    "aiNotes" TEXT,
    "notesCustomer" TEXT,
    "notesInternal" TEXT,
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_items" (
    "id" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "serviceCatalogItemId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCatalogCategory",
    "unit" "ServiceCatalogUnit" NOT NULL DEFAULT 'FLAT',
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "riskMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "riskAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimateNumber_key" ON "estimates"("estimateNumber");

-- CreateIndex
CREATE INDEX "estimates_tenantKey_idx" ON "estimates"("tenantKey");

-- CreateIndex
CREATE INDEX "estimates_customerId_idx" ON "estimates"("customerId");

-- CreateIndex
CREATE INDEX "estimates_orderId_idx" ON "estimates"("orderId");

-- CreateIndex
CREATE INDEX "estimates_sessionId_idx" ON "estimates"("sessionId");

-- CreateIndex
CREATE INDEX "estimates_status_idx" ON "estimates"("status");

-- CreateIndex
CREATE INDEX "estimates_createdAt_idx" ON "estimates"("createdAt");

-- CreateIndex
CREATE INDEX "estimate_items_estimateId_idx" ON "estimate_items"("estimateId");

-- CreateIndex
CREATE INDEX "estimate_items_serviceCatalogItemId_idx" ON "estimate_items"("serviceCatalogItemId");

-- CreateIndex
CREATE INDEX "estimate_items_category_idx" ON "estimate_items"("category");

-- CreateIndex
CREATE INDEX "estimate_items_sortOrder_idx" ON "estimate_items"("sortOrder");

-- CreateIndex
CREATE INDEX "attachments_estimateId_idx" ON "attachments"("estimateId");

-- CreateIndex
CREATE INDEX "audit_logs_estimateId_idx" ON "audit_logs"("estimateId");

-- CreateIndex
CREATE INDEX "notifications_estimateId_idx" ON "notifications"("estimateId");

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_items" ADD CONSTRAINT "estimate_items_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "service_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
