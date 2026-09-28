-- CreateTable
CREATE TABLE "GenerationExecution" (
    "generationId" UUID NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PREPARING',
    "owner" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerAttempts" INTEGER NOT NULL DEFAULT 0,
    "rawPath" TEXT,
    "rawMimeType" TEXT,
    "rawBytes" INTEGER NOT NULL DEFAULT 0,
    "providerRequestId" TEXT,
    "regulatorKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationExecution_pkey" PRIMARY KEY ("generationId")
);

-- CreateTable
CREATE TABLE "GenerationRegulator" (
    "key" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "nextDispatchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIncreaseAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cooldownUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GenerationRegulator_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GenerationPermit" (
    "generationId" UUID NOT NULL,
    "regulatorKey" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationPermit_pkey" PRIMARY KEY ("generationId")
);

-- CreateIndex
CREATE INDEX "GenerationExecution_stage_nextAttemptAt_leaseUntil_idx" ON "GenerationExecution"("stage", "nextAttemptAt", "leaseUntil");

-- CreateIndex
CREATE INDEX "GenerationPermit_regulatorKey_expiresAt_idx" ON "GenerationPermit"("regulatorKey", "expiresAt");

-- AddForeignKey
ALTER TABLE "GenerationExecution" ADD CONSTRAINT "GenerationExecution_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
