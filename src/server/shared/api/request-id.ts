import { z } from "zod";

const requestIdSchema = z.uuid();

export function getRequestId(headers: Headers): string {
  const incoming = headers.get("x-request-id");
  return requestIdSchema.safeParse(incoming).success
    ? incoming!
    : crypto.randomUUID();
}
