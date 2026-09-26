import "server-only";

import type { NextRequest } from "next/server";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { consumeRateLimit } from "./rate-limit-operations";
import { getDb } from "@/server/shared/db/prisma";

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super("Слишком много запросов. Попробуйте позже");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit = 30,
  windowMs = 60_000,
  userId?: string,
) {
  // Production web доступен только через Caddy; для анонимных запросов берём
  // первый адрес, который прокси передал в X-Forwarded-For.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const subject = userId
    ? `user:${userId}`
    : `ip:${forwarded && isIP(forwarded) ? forwarded : "unknown"}`;
  const key = createHash("sha256").update(`${scope}:${subject}`).digest("hex");
  const result = await consumeRateLimit(getDb(), key, limit, windowMs);
  if (!result.allowed) throw new RateLimitError(result.retryAfter);
}
