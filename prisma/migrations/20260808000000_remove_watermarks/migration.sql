-- Watermarks are no longer part of generation results or plan policy.
-- Existing successful generations immediately expose their clean original.
UPDATE "Generation"
SET "resultUserId" = "resultOriginalId"
WHERE "resultOriginalId" IS NOT NULL
  AND "resultUserId" IS NOT NULL;

ALTER TABLE "Plan" DROP COLUMN "watermarkRequired";

DELETE FROM "MediaFile"
WHERE "type" = 'WATERMARK'::"MediaType";

ALTER TYPE "MediaType" RENAME TO "MediaType_old";
CREATE TYPE "MediaType" AS ENUM (
  'SOURCE_IMAGE',
  'SOURCE_PREVIEW',
  'VISUAL_PROMPT',
  'REFERENCE',
  'GENERATION_ORIGINAL',
  'GENERATION_RESULT'
);
ALTER TABLE "MediaFile"
  ALTER COLUMN "type" TYPE "MediaType"
  USING ("type"::text::"MediaType");
DROP TYPE "MediaType_old";
