import { readFile } from "node:fs/promises";
try {
  const value = JSON.parse(await readFile(process.env.WORKER_HEARTBEAT_FILE || "/tmp/ruvie-worker-heartbeat.json", "utf8"));
  process.exit(Number.isFinite(value.at) && Date.now() - value.at < 60_000 ? 0 : 1);
} catch { process.exit(1); }
