import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "postgresql://postgres:postgres@localhost:54322/postgres",
  },
});
