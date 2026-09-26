import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { TIMEWEB_TEST_DATABASE_URL } from "../src/server/shared/db/test-database.ts";

// Next/Vite сами читают .env. Пустые значения в дочернем env блокируют эту
// подстановку. Значения существующих файлов никогда не печатаются и не меняются.
const env = {};
for (const directory of [".", "admin"]) {
  for (const file of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    try {
      const names = Object.keys(
        parse(await readFile(`${directory}/${file}`, "utf8")),
      );
      for (const name of names) env[name] = "";
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot"]) {
  if (process.env[key]) env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: "production",
  NEXT_OUTPUT: "standalone",
  NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: TIMEWEB_TEST_DATABASE_URL,
  DIRECT_URL: TIMEWEB_TEST_DATABASE_URL,
  DATABASE_SSL_MODE: "disable",
  APP_URL: "http://localhost:3000",
  APP_ORIGINS: "http://localhost:3000",
  ADMIN_ORIGINS: "http://localhost:8080",
  AUTH_COOKIE_DOMAIN: "localhost",
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "Ruvie",
  NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: "",
  AUTH_SESSION_SECRET: "preview-auth-secret-only-000000000000000",
  GOOGLE_OAUTH_CLIENT_ID: "preview.invalid",
  GOOGLE_OAUTH_CLIENT_SECRET: "preview-only",
  GOOGLE_OAUTH_CALLBACK_URL: "https://example.invalid/auth/callback",
  STORAGE_ROOT: "/tmp/ruvie-preview-media",
  STORAGE_PUBLIC_ORIGIN: "https://example.invalid",
  STORAGE_SIGNING_SECRET: "preview-storage-secret-only-000000000000",
  ADMIN_ACCESS_CODE: "preview-only",
  ADMIN_TOKEN_SECRET: "preview-only-not-a-production-secret-000000",
  AI_PROVIDER: "fake",
  PAYMENT_PROVIDER: "disabled",
  GENERATIONS_ENABLED: "false",
  VITE_API_BASE_URL: "http://localhost:3000",
});

for (const args of [
  ["exec", "prisma", "generate", "--config", "prisma.config.ts"],
  ["exec", "next", "build"],
  ["admin:build"],
  ["worker:build"],
  ["worker:ops:build"],
]) {
  // Проверка не должна сама запускать установку и менять node_modules.
  const result = spawnSync(
    "pnpm",
    ["--config.verify-deps-before-run=false", ...args],
    {
      env,
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error) {
    console.error("Не удалось запустить pnpm.");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
