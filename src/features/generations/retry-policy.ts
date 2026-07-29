import { idempotencyKeySchema } from "./schema.ts";

export function parseRetryIdempotencyKey(value: string | null) {
  return idempotencyKeySchema.parse(value);
}

export function namespaceRetryIdempotencyKey(
  failedGenerationId: string,
  clientKey: string,
) {
  return `retry:${failedGenerationId}:${clientKey}`;
}
