import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { requireIsolatedTestDatabase } from "../../src/server/shared/db/test-database.ts";

const database = requireIsolatedTestDatabase(process.env.TEST_DATABASE_URL);
// Берём только тестовую конфигурацию; пользовательский .env в процесс не загружается.
const configuration = JSON.parse(
  execFileSync(
    "docker",
    ["compose", "-f", "docker-compose.load.yml", "config", "--format", "json"],
    { encoding: "utf8" },
  ),
);
const root = resolve(".data/load/verification-media");
await mkdir(root, { recursive: true });
execFileSync(
  "pnpm",
  [
    "exec",
    "esbuild",
    "scripts/load/verify-worker.ts",
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--packages=external",
    "--alias:server-only=./scripts/server-only-empty.js",
    "--outfile=.data/load/verify-worker.mjs",
  ],
  { stdio: "inherit" },
);
execFileSync(process.execPath, [".data/load/verify-worker.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ...configuration.services.worker.environment,
    DATABASE_URL: database,
    DIRECT_URL: database,
    STORAGE_ROOT: root,
  },
});
