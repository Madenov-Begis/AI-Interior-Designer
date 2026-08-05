import "server-only";

import type { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super("Слишком много запросов. Попробуйте позже");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit = 30,
  windowMs = 60_000,
) {
  const now = Date.now();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `${scope}:${ip}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit)
    throw new RateLimitError(
      Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    );
  current.count += 1;
  if (buckets.size > 10_000)
    for (const [bucketKey, entry] of buckets)
      if (entry.resetAt <= now) buckets.delete(bucketKey);
}
