import { defineConfig } from "prisma/config";

// Фиксированная БД только внутри локального Docker Compose.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: "postgresql://ruvie_test:local-test-only@postgres:5432/ruvie_refactor_test",
  },
});
