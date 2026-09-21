ALTER TABLE "RoomType"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "nameUz" TEXT;

ALTER TABLE "CreditPackage"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "nameUz" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "descriptionUz" TEXT;

ALTER TABLE "PaymentOrder"
  ADD COLUMN "packageNameEn" TEXT,
  ADD COLUMN "packageNameUz" TEXT;

UPDATE "RoomType"
SET
  "nameEn" = CASE "code"
    WHEN 'living-room' THEN 'Living room'
    WHEN 'bedroom' THEN 'Bedroom'
    WHEN 'kitchen' THEN 'Kitchen'
    WHEN 'bathroom' THEN 'Bathroom'
    WHEN 'kids-room' THEN 'Kids room'
    WHEN 'home-office' THEN 'Home office'
    WHEN 'hallway' THEN 'Hallway'
    WHEN 'balcony-loggia' THEN 'Balcony / loggia'
    ELSE "name"
  END,
  "nameUz" = CASE "code"
    WHEN 'living-room' THEN 'Mehmonxona'
    WHEN 'bedroom' THEN 'Yotoqxona'
    WHEN 'kitchen' THEN 'Oshxona'
    WHEN 'bathroom' THEN 'Hammom'
    WHEN 'kids-room' THEN 'Bolalar xonasi'
    WHEN 'home-office' THEN 'Ish xonasi'
    WHEN 'hallway' THEN 'Dahliz'
    WHEN 'balcony-loggia' THEN 'Balkon / lodjiya'
    ELSE NULL
  END;

UPDATE "CreditPackage"
SET
  "nameEn" = CASE "code"
    WHEN 'mini' THEN 'Mini'
    WHEN 'standard' THEN 'Standard'
    WHEN 'pro' THEN 'Pro'
    ELSE "name"
  END,
  "nameUz" = CASE "code"
    WHEN 'mini' THEN 'Mini'
    WHEN 'standard' THEN 'Standart'
    WHEN 'pro' THEN 'Pro'
    ELSE NULL
  END,
  "descriptionEn" = CASE "code"
    WHEN 'mini' THEN 'Try the service'
    WHEN 'standard' THEN 'Best for renovation'
    WHEN 'pro' THEN 'For multiple projects'
    ELSE NULL
  END,
  "descriptionUz" = CASE "code"
    WHEN 'mini' THEN 'Xizmatni sinab ko‘rish uchun'
    WHEN 'standard' THEN 'Ta’mirlash uchun maqbul'
    WHEN 'pro' THEN 'Bir nechta loyiha uchun'
    ELSE NULL
  END;

UPDATE "PaymentOrder" AS orders
SET
  "packageNameEn" = packages."nameEn",
  "packageNameUz" = packages."nameUz"
FROM "CreditPackage" AS packages
WHERE packages."code" = orders."packageCode";
