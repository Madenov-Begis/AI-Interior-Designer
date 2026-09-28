import { defineConfig } from "prisma/config";

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://ruvie_test:local-test-only@127.0.0.1:55432/ruvie_refactor_test";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
