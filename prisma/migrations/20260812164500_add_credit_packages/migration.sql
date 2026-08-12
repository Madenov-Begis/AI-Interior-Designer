CREATE TABLE "CreditPackage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "credits" INTEGER NOT NULL,
  "priceUzs" INTEGER NOT NULL,
  "popular" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CreditPackage_credits_positive" CHECK ("credits" > 0),
  CONSTRAINT "CreditPackage_price_positive" CHECK ("priceUzs" > 0),
  CONSTRAINT "CreditPackage_popular_requires_active" CHECK (NOT "popular" OR "active")
);

CREATE UNIQUE INDEX "CreditPackage_code_key" ON "CreditPackage"("code");
CREATE INDEX "CreditPackage_active_sortOrder_idx" ON "CreditPackage"("active", "sortOrder");
CREATE UNIQUE INDEX "CreditPackage_one_active_popular_key"
  ON "CreditPackage" ((1))
  WHERE "popular" AND "active";

INSERT INTO "CreditPackage"
  ("code", "name", "description", "credits", "priceUzs", "popular", "active", "sortOrder", "updatedAt")
VALUES
  ('mini', 'Мини', 'Для пробы сервиса', 20, 25000, false, true, 10, CURRENT_TIMESTAMP),
  ('standard', 'Стандарт', 'Оптимально для ремонта', 60, 69000, true, true, 20, CURRENT_TIMESTAMP),
  ('pro', 'Про', 'Для нескольких проектов', 160, 169000, false, true, 30, CURRENT_TIMESTAMP);
