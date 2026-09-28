import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export const INITIAL_ROOM_TYPES = [
  {
    code: "living-room",
    name: "Гостиная",
    nameEn: "Living room",
    nameUz: "Mehmonxona",
    promptModifier:
      "Назначение помещения: гостиная. Организуй удобную зону отдыха и общения, сохрани свободные проходы, реалистичный масштаб мягкой мебели и функциональное зонирование.",
    active: true,
    sortOrder: 10,
  },
  {
    code: "bedroom",
    name: "Спальня",
    nameEn: "Bedroom",
    nameUz: "Yotoqxona",
    promptModifier:
      "Назначение помещения: спальня. Создай спокойную приватную обстановку, предусмотрев удобную зону сна, хранение, проходы и мягкое функциональное освещение.",
    active: true,
    sortOrder: 20,
  },
  {
    code: "kitchen",
    name: "Кухня",
    nameEn: "Kitchen",
    nameUz: "Oshxona",
    promptModifier:
      "Назначение помещения: кухня. Соблюдай функциональную рабочую последовательность, безопасные проходы, реалистичные размеры техники, хранения и рабочих поверхностей.",
    active: true,
    sortOrder: 30,
  },
  {
    code: "bathroom",
    name: "Ванная",
    nameEn: "Bathroom",
    nameUz: "Hammom",
    promptModifier:
      "Назначение помещения: ванная комната. Учитывай влагостойкие материалы, безопасную эргономику сантехники, хранение, проходы и практичное освещение.",
    active: true,
    sortOrder: 40,
  },
  {
    code: "kids-room",
    name: "Детская",
    nameEn: "Kids room",
    nameUz: "Bolalar xonasi",
    promptModifier:
      "Назначение помещения: детская комната. Организуй безопасные и возрастно-нейтральные зоны сна, хранения, занятий и свободного движения с реалистичным масштабом мебели.",
    active: true,
    sortOrder: 50,
  },
  {
    code: "home-office",
    name: "Кабинет",
    nameEn: "Home office",
    nameUz: "Ish xonasi",
    promptModifier:
      "Назначение помещения: домашний кабинет. Создай эргономичное рабочее место, достаточное хранение, комфортные проходы и освещение без бликов на рабочей поверхности.",
    active: true,
    sortOrder: 60,
  },
  {
    code: "hallway",
    name: "Прихожая",
    nameEn: "Hallway",
    nameUz: "Dahliz",
    promptModifier:
      "Назначение помещения: прихожая. Предусмотри удобный входной проход, компактное хранение верхней одежды и обуви, практичные материалы и ясное освещение.",
    active: true,
    sortOrder: 70,
  },
  {
    code: "balcony-loggia",
    name: "Балкон / лоджия",
    nameEn: "Balcony / loggia",
    nameUz: "Balkon / lodjiya",
    promptModifier:
      "Назначение помещения: балкон или лоджия. Используй компактную мебель и безопасные проходы, учитывай остекление, естественный свет и ограниченную площадь помещения.",
    active: true,
    sortOrder: 80,
  },
];

export const INITIAL_CREDIT_PACKAGES = [
  {
    code: "mini",
    name: "Мини",
    nameEn: "Mini",
    nameUz: "Mini",
    description: "Для пробы сервиса",
    descriptionEn: "Try the service",
    descriptionUz: "Xizmatni sinab ko‘rish uchun",
    credits: 20,
    priceUzs: 25000,
    popular: false,
    active: true,
    sortOrder: 10,
  },
  {
    code: "standard",
    name: "Стандарт",
    nameEn: "Standard",
    nameUz: "Standart",
    description: "Оптимально для ремонта",
    descriptionEn: "Best for renovation",
    descriptionUz: "Ta’mirlash uchun maqbul",
    credits: 60,
    priceUzs: 69000,
    popular: true,
    active: true,
    sortOrder: 20,
  },
  {
    code: "pro",
    name: "Про",
    nameEn: "Pro",
    nameUz: "Pro",
    description: "Для нескольких проектов",
    descriptionEn: "For multiple projects",
    descriptionUz: "Bir nechta loyiha uchun",
    credits: 160,
    priceUzs: 169000,
    popular: false,
    active: true,
    sortOrder: 30,
  },
];

export async function seedCatalogs() {
  console.log("Seeding room types...");
  for (const item of INITIAL_ROOM_TYPES) {
    await db.roomType.upsert({
      where: { code: item.code },
      create: {
        id: randomUUID(),
        ...item,
      },
      update: {
        name: item.name,
        nameEn: item.nameEn,
        nameUz: item.nameUz,
        promptModifier: item.promptModifier,
        sortOrder: item.sortOrder,
        active: item.active,
      },
    });
  }
  console.log(`✓ Seeded ${INITIAL_ROOM_TYPES.length} room types.`);

  console.log("Seeding credit packages...");
  for (const item of INITIAL_CREDIT_PACKAGES) {
    await db.creditPackage.upsert({
      where: { code: item.code },
      create: {
        id: randomUUID(),
        ...item,
      },
      update: {
        name: item.name,
        nameEn: item.nameEn,
        nameUz: item.nameUz,
        description: item.description,
        descriptionEn: item.descriptionEn,
        descriptionUz: item.descriptionUz,
        credits: item.credits,
        priceUzs: item.priceUzs,
        popular: item.popular,
        sortOrder: item.sortOrder,
        active: item.active,
      },
    });
  }
  console.log(`✓ Seeded ${INITIAL_CREDIT_PACKAGES.length} credit packages.`);
}

try {
  await seedCatalogs();
} finally {
  await db.$disconnect();
}
