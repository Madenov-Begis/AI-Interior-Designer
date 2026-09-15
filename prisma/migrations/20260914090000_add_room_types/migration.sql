CREATE TABLE "RoomType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promptModifier" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoomType_code_key" ON "RoomType"("code");
CREATE INDEX "RoomType_active_sortOrder_idx" ON "RoomType"("active", "sortOrder");

ALTER TABLE "Generation"
    ADD COLUMN "roomTypeId" UUID,
    ADD COLUMN "roomCode" TEXT,
    ADD COLUMN "roomName" TEXT,
    ADD COLUMN "roomPrompt" TEXT;

CREATE INDEX "Generation_roomTypeId_idx" ON "Generation"("roomTypeId");

ALTER TABLE "Generation"
    ADD CONSTRAINT "Generation_roomTypeId_fkey"
    FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RoomType" ("id", "code", "name", "promptModifier", "active", "sortOrder", "createdAt", "updatedAt") VALUES
    (gen_random_uuid(), 'living-room', 'Гостиная', 'Назначение помещения: гостиная. Организуй удобную зону отдыха и общения, сохрани свободные проходы, реалистичный масштаб мягкой мебели и функциональное зонирование.', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'bedroom', 'Спальня', 'Назначение помещения: спальня. Создай спокойную приватную обстановку, предусмотрев удобную зону сна, хранение, проходы и мягкое функциональное освещение.', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'kitchen', 'Кухня', 'Назначение помещения: кухня. Соблюдай функциональную рабочую последовательность, безопасные проходы, реалистичные размеры техники, хранения и рабочих поверхностей.', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'bathroom', 'Ванная', 'Назначение помещения: ванная комната. Учитывай влагостойкие материалы, безопасную эргономику сантехники, хранение, проходы и практичное освещение.', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'kids-room', 'Детская', 'Назначение помещения: детская комната. Организуй безопасные и возрастно-нейтральные зоны сна, хранения, занятий и свободного движения с реалистичным масштабом мебели.', true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'home-office', 'Кабинет', 'Назначение помещения: домашний кабинет. Создай эргономичное рабочее место, достаточное хранение, комфортные проходы и освещение без бликов на рабочей поверхности.', true, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'hallway', 'Прихожая', 'Назначение помещения: прихожая. Предусмотри удобный входной проход, компактное хранение верхней одежды и обуви, практичные материалы и ясное освещение.', true, 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'balcony-loggia', 'Балкон / лоджия', 'Назначение помещения: балкон или лоджия. Используй компактную мебель и безопасные проходы, учитывай остекление, естественный свет и ограниченную площадь помещения.', true, 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
