-- CreateTable
CREATE TABLE "public_security_events" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "ipHash" TEXT,
    "fingerprintHash" TEXT,
    "userAgentHash" TEXT,
    "tokenPrefix" TEXT,
    "path" TEXT,
    "method" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_access_logs" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ipHash" TEXT,
    "fingerprintHash" TEXT,
    "userAgentHash" TEXT,
    "tokenPrefix" TEXT,
    "rateLimitKey" TEXT,
    "rateLimitAllowed" BOOLEAN,
    "rateLimitRemaining" INTEGER,
    "retryAfterSeconds" INTEGER,
    "requestBytes" INTEGER,
    "responseMs" INTEGER,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_security_events_scope_idx" ON "public_security_events"("scope");

-- CreateIndex
CREATE INDEX "public_security_events_reason_idx" ON "public_security_events"("reason");

-- CreateIndex
CREATE INDEX "public_security_events_severity_idx" ON "public_security_events"("severity");

-- CreateIndex
CREATE INDEX "public_security_events_createdAt_idx" ON "public_security_events"("createdAt");

-- CreateIndex
CREATE INDEX "public_security_events_scope_createdAt_idx" ON "public_security_events"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "public_security_events_severity_createdAt_idx" ON "public_security_events"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "public_security_events_fingerprintHash_createdAt_idx" ON "public_security_events"("fingerprintHash", "createdAt");

-- CreateIndex
CREATE INDEX "public_security_events_tokenPrefix_idx" ON "public_security_events"("tokenPrefix");

-- CreateIndex
CREATE INDEX "public_access_logs_scope_idx" ON "public_access_logs"("scope");

-- CreateIndex
CREATE INDEX "public_access_logs_path_idx" ON "public_access_logs"("path");

-- CreateIndex
CREATE INDEX "public_access_logs_statusCode_idx" ON "public_access_logs"("statusCode");

-- CreateIndex
CREATE INDEX "public_access_logs_success_idx" ON "public_access_logs"("success");

-- CreateIndex
CREATE INDEX "public_access_logs_createdAt_idx" ON "public_access_logs"("createdAt");

-- CreateIndex
CREATE INDEX "public_access_logs_scope_createdAt_idx" ON "public_access_logs"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "public_access_logs_fingerprintHash_createdAt_idx" ON "public_access_logs"("fingerprintHash", "createdAt");

-- CreateIndex
CREATE INDEX "public_access_logs_tokenPrefix_idx" ON "public_access_logs"("tokenPrefix");
