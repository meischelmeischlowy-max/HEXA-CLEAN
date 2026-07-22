-- CreateEnum
CREATE TYPE "AvailabilitySlotStatus" AS ENUM (
    'AVAILABLE',
    'BOOKED',
    'BLOCKED'
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantKey" TEXT NOT NULL DEFAULT 'hexa-clean',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilitySlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "orderId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_orderId_key"
ON "availability_slots"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_tenantKey_startAt_endAt_key"
ON "availability_slots"("tenantKey", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "availability_slots_tenantKey_idx"
ON "availability_slots"("tenantKey");

-- CreateIndex
CREATE INDEX "availability_slots_status_idx"
ON "availability_slots"("status");

-- CreateIndex
CREATE INDEX "availability_slots_startAt_idx"
ON "availability_slots"("startAt");

-- CreateIndex
CREATE INDEX "availability_slots_endAt_idx"
ON "availability_slots"("endAt");

-- CreateIndex
CREATE INDEX "availability_slots_tenantKey_status_startAt_idx"
ON "availability_slots"("tenantKey", "status", "startAt");

-- AddForeignKey
ALTER TABLE "availability_slots"
ADD CONSTRAINT "availability_slots_orderId_fkey"
FOREIGN KEY ("orderId")
REFERENCES "orders"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
