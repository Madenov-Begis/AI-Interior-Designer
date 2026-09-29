/** Чистые правила нагрузки и повторов; время и случайность передаются явно. */
export function nextAdaptiveLimit(input: {
  limit: number;
  maximum: number;
  successes: number;
  lastIncreaseAt: number;
  cooldownUntil: number;
  now: number;
  backlog: boolean;
}) {
  return input.backlog &&
    input.successes > 0 &&
    input.now >= input.cooldownUntil &&
    input.now - input.lastIncreaseAt >= 10_000
    ? Math.min(input.maximum, input.limit + 1)
    : Math.min(input.maximum, input.limit);
}

export function providerFailure(error: unknown, now = Date.now()) {
  const value = error as {
    status?: number;
    code?: number;
    response?: {
      status?: number;
      headers?: { get?: (name: string) => string | null };
    };
    headers?: { get?: (name: string) => string | null };
    retryAfter?: string;
  } | null;
  const throttled =
    Number(value?.status ?? value?.response?.status ?? value?.code) === 429;
  const header =
    value?.retryAfter ??
    value?.headers?.get?.("retry-after") ??
    value?.response?.headers?.get?.("retry-after");
  const parsed = header
    ? /^\d+(\.\d+)?$/.test(header)
      ? Number(header) * 1000
      : Date.parse(header) - now
    : 0;
  return {
    throttled,
    retryAfterMs: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
  };
}

export function retryDelay(
  attempt: number,
  retryAfterMs: number,
  random = Math.random(),
) {
  return Math.max(
    retryAfterMs,
    1000 * 2 ** Math.max(0, attempt - 1) * (0.5 + random),
  );
}

export function memoryPaused(previous: boolean, rss: number, budget: number) {
  return budget > 0 && rss >= budget * (previous ? 0.6 : 0.75);
}
