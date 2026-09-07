CREATE TABLE "RateLimitBucket" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "RateLimitBucket" FROM anon, authenticated;

CREATE TABLE "StorageDeletion" (
  "id" UUID PRIMARY KEY,
  "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StorageDeletion_bucket_path_key" ON "StorageDeletion"("bucket", "path");
CREATE INDEX "StorageDeletion_nextAttemptAt_idx" ON "StorageDeletion"("nextAttemptAt");
ALTER TABLE "StorageDeletion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StorageDeletion" FROM anon, authenticated;

-- Preserve the most recently updated popular active package, if legacy duplicates exist.
WITH ranked AS (
 SELECT "id", row_number() OVER (ORDER BY "updatedAt" DESC, "id" DESC) AS rank
 FROM "CreditPackage" WHERE "popular" AND "active"
)
UPDATE "CreditPackage" SET "popular" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rank > 1);
CREATE UNIQUE INDEX "CreditPackage_one_active_popular" ON "CreditPackage" ((true)) WHERE "popular" AND "active";

CREATE TABLE "StorageUpload" (
 "id" UUID PRIMARY KEY,
 "ownerId" UUID NOT NULL,
 "target" TEXT NOT NULL,
 "path" TEXT NOT NULL UNIQUE,
 "originalName" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL,
 "sizeBytes" INTEGER NOT NULL,
 "expiresAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "StorageUpload_expiresAt_idx" ON "StorageUpload"("expiresAt");
ALTER TABLE "StorageUpload" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "StorageUpload" FROM anon, authenticated;
