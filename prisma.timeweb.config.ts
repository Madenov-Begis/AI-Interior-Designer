import { defineConfig } from "prisma/config";

// Только служебный контейнер Timeweb. dotenv и старую историю не используем.
const url = process.env.DIRECT_URL;
if (!url) throw new Error("TIMEWEB_DATABASE_URL_REQUIRED");
const target = new URL(url);
if (
  !["postgres:", "postgresql:"].includes(target.protocol) ||
  target.hostname !== "postgres" ||
  target.port !== "5432" ||
  target.pathname !== "/ruvie" ||
  target.username !== "ruvie_migrator" ||
  target.search ||
  target.hash
)
  throw new Error("TIMEWEB_DATABASE_TARGET_REQUIRED");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
