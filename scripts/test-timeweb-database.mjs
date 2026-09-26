import { spawnSync } from "node:child_process";
import { TIMEWEB_TEST_DATABASE_URL } from "../src/server/shared/db/test-database.ts";

// Фиксированная локальная цель. dotenv здесь и в Prisma-конфиге не загружается.
const env = {
  ...process.env,
  TEST_DATABASE_URL: TIMEWEB_TEST_DATABASE_URL,
  DATABASE_URL: TIMEWEB_TEST_DATABASE_URL,
  DIRECT_URL: TIMEWEB_TEST_DATABASE_URL,
  DATABASE_SSL_MODE: "disable",
};
for (const args of [
  ["exec", "prisma", "generate", "--config", "prisma.config.ts"],
  [
    "exec",
    "prisma",
    "migrate",
    "deploy",
    "--config",
    "prisma.config.ts",
  ],
  ["test:integration"],
]) {
  let result = spawnSync(
    "pnpm",
    ["--config.verify-deps-before-run=false", ...args],
    {
      env,
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error?.code === "ENOENT") {
    result = spawnSync(
      "corepack",
      ["pnpm", "--config.verify-deps-before-run=false", ...args],
      { env, stdio: "inherit", shell: false },
    );
  }
  if (result.error) {
    console.error(
      "Не удалось запустить pnpm через Corepack. Проверьте установку Node.js.",
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
