import { readFile } from "node:fs/promises";
import pg from "pg";

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

const databaseUrl =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL is required");
}

const limits = {
  failedWindowMinutes: positiveInteger("FAILED_WINDOW_MINUTES", 30),
  maxRecentFailed: positiveInteger("MAX_RECENT_FAILED", 3),
  queuedAgeMinutes: positiveInteger("QUEUED_STALE_MINUTES", 15),
  processingAgeMinutes: positiveInteger("PROCESSING_STALE_MINUTES", 30),
  refundWindowMinutes: positiveInteger("REFUND_WINDOW_MINUTES", 60),
  maxRecentRefunds: positiveInteger("MAX_RECENT_TECHNICAL_REFUNDS", 3),
};

const now = Date.now();
const before = (minutes) => new Date(now - minutes * 60_000);
const ca = await readFile(
  new URL("../prisma/certs/supabase-root-2021.crt", import.meta.url),
  "utf8",
);
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { ca, rejectUnauthorized: true },
  connectionTimeoutMillis: 10_000,
  query_timeout: 10_000,
});

try {
  await client.connect();
  const [generationResult, refundResult] = await Promise.all([
    client.query(
      `select
         count(*) filter (where status = 'FAILED' and "completedAt" >= $1)::int as "recentFailed",
         count(*) filter (where status = 'QUEUED' and "queuedAt" < $2)::int as "staleQueued",
         count(*) filter (
           where status = 'PROCESSING' and coalesce("startedAt", "queuedAt") < $3
         )::int as "staleProcessing"
       from "Generation"
       where "deletedAt" is null`,
      [
        before(limits.failedWindowMinutes),
        before(limits.queuedAgeMinutes),
        before(limits.processingAgeMinutes),
      ],
    ),
    client.query(
      `select count(*)::int as "recentTechnicalRefunds"
       from "CreditTransaction"
       where kind = 'TECHNICAL_REFUND' and "createdAt" >= $1`,
      [before(limits.refundWindowMinutes)],
    ),
  ]);

  const metrics = { ...generationResult.rows[0], ...refundResult.rows[0] };
  const violations = [];
  if (metrics.recentFailed > limits.maxRecentFailed) {
    violations.push(
      `recent FAILED ${metrics.recentFailed} > ${limits.maxRecentFailed}`,
    );
  }
  if (metrics.staleQueued > 0)
    violations.push(`stale QUEUED ${metrics.staleQueued} > 0`);
  if (metrics.staleProcessing > 0) {
    violations.push(`stale PROCESSING ${metrics.staleProcessing} > 0`);
  }
  if (metrics.recentTechnicalRefunds > limits.maxRecentRefunds) {
    violations.push(
      `recent technical refunds ${metrics.recentTechnicalRefunds} > ${limits.maxRecentRefunds}`,
    );
  }

  console.log(JSON.stringify({ metrics, limits }));
  if (violations.length > 0) throw new Error(violations.join("; "));
  console.log("Generation health thresholds passed");
} finally {
  await client.end().catch(() => undefined);
}
