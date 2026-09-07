import type { PrismaClient } from "../../../generated/prisma/client.ts";

export async function consumeRateLimit(
  db: Pick<PrismaClient, "$queryRaw">,
  key: string,
  limit: number,
  windowMs: number,
) {
  const rows = await db.$queryRaw<Array<{ count: number; retryAfter: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= clock_timestamp() THEN 1 ELSE LEAST("RateLimitBucket"."count" + 1, ${limit + 1}) END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= clock_timestamp() THEN clock_timestamp() + ${windowMs} * interval '1 millisecond' ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("resetAt" - clock_timestamp()))))::int AS "retryAfter"
  `;
  return { allowed: rows[0]!.count <= limit, retryAfter: rows[0]!.retryAfter };
}
