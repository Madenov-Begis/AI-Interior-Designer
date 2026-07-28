ALTER TABLE "Generation"
ADD COLUMN "parentGenerationId" UUID;

ALTER TABLE "Generation"
ADD CONSTRAINT "Generation_parentGenerationId_fkey"
FOREIGN KEY ("parentGenerationId") REFERENCES "Generation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Generation_parentGenerationId_createdAt_idx"
ON "Generation"("parentGenerationId", "createdAt");
