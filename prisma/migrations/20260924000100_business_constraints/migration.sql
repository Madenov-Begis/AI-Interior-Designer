-- Prisma schema не описывает CHECK и частичные уникальные индексы.
-- Сохранены действующие ограничения из истории Supabase; данные не создаются.
ALTER TABLE "CreditPackage"
  ADD CONSTRAINT "CreditPackage_credits_positive" CHECK ("credits" > 0),
  ADD CONSTRAINT "CreditPackage_price_positive" CHECK ("priceUzs" > 0),
  ADD CONSTRAINT "CreditPackage_popular_requires_active" CHECK (NOT "popular" OR "active");

-- В старой истории два эквивалентных индекса. Достаточно одного ограничения.
CREATE UNIQUE INDEX "CreditPackage_one_active_popular"
  ON "CreditPackage" ((true)) WHERE "popular" AND "active";

-- Прямой SQL seed в старой истории использовал этот default; Prisma UUID
-- генерирует на клиенте, поэтому migrate diff не включает его автоматически.
ALTER TABLE "CreditPackage" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
