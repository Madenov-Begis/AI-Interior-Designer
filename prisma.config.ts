import { defineConfig } from "prisma/config";

// Локальные Prisma-команды не читают старые .env и работают только с test DB.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "postgresql://ruvie_test:local-test-only@127.0.0.1:55432/ruvie_refactor_test",
  },
});
