import { config } from "dotenv";
config({ path: ".env.local" });
config({
  path: process.env.ADMIN_ENV_FILE ?? "admin/.env.local",
  override: true,
});

import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const accessCode = process.env.ADMIN_ACCESS_CODE?.trim();
const tokenSecret = process.env.ADMIN_TOKEN_SECRET;
const phone = process.env.ADMIN_PHONE_E164?.trim() || null;
if (!accessCode || [...accessCode].length < 5)
  throw new Error("ADMIN_ACCESS_CODE must contain at least 5 characters");
if (!tokenSecret || tokenSecret.length < 32)
  throw new Error("ADMIN_TOKEN_SECRET must contain at least 32 characters");
if (phone && !/^\+998\d{9}$/.test(phone))
  throw new Error("ADMIN_PHONE_E164 must use +998XXXXXXXXX format when provided");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
try {
  const existing = phone
    ? await db.profile.findUnique({ where: { phone } })
    : await db.profile.findFirst({
        where: { role: "ADMIN" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

  const profile = existing
    ? await db.profile.update({
        where: { id: existing.id },
        data: { phone, role: "ADMIN", status: "ACTIVE", deletedAt: null },
      })
    : await db.profile.create({
        data: {
          id: randomUUID(),
          email: null,
          phone,
          displayName: "Администратор",
          role: "ADMIN",
          status: "ACTIVE",
        },
      });

  console.log(`Admin profile prepared: ${profile.id}`);
  console.log("Access code remains only in ADMIN_ACCESS_CODE; it was not written to the database.");
} finally {
  await db.$disconnect();
}
