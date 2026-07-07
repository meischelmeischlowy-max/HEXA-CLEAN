-- CreateTable
CREATE TABLE "public_offer_links" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT,
    "quoteId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_offer_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_offer_links_tokenHash_key" ON "public_offer_links"("tokenHash");

-- CreateIndex
CREATE INDEX "public_offer_links_quoteId_idx" ON "public_offer_links"("quoteId");

-- CreateIndex
CREATE INDEX "public_offer_links_customerId_idx" ON "public_offer_links"("customerId");

-- CreateIndex
CREATE INDEX "public_offer_links_expiresAt_idx" ON "public_offer_links"("expiresAt");

-- CreateIndex
CREATE INDEX "public_offer_links_acceptedAt_idx" ON "public_offer_links"("acceptedAt");

-- CreateIndex
CREATE INDEX "public_offer_links_revokedAt_idx" ON "public_offer_links"("revokedAt");

-- AddForeignKey
ALTER TABLE "public_offer_links" ADD CONSTRAINT "public_offer_links_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_offer_links" ADD CONSTRAINT "public_offer_links_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
