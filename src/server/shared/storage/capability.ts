import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { STORAGE_BUCKETS } from "../config/storage.ts";
import { StorageFailure } from "./types.ts";

const knownBuckets = new Set<string>(Object.values(STORAGE_BUCKETS));

export function validateObjectKey(bucket: string, key: string) {
  if (
    !knownBuckets.has(bucket) ||
    key.length > 1024 ||
    !key.length ||
    key
      .split("/")
      .some(
        (part) =>
          !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) ||
          part === "." ||
          part === "..",
      )
  ) {
    throw new StorageFailure("STORAGE_INVALID_PATH", 400);
  }
}

const base = {
  v: z.literal(1),
  bucket: z.string(),
  key: z.string(),
  exp: z.number().int().positive(),
};
const capabilitySchema = z.discriminatedUnion("operation", [
  z
    .object({
      ...base,
      operation: z.literal("read"),
      download: z.string().max(200).optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      operation: z.literal("write"),
      sizeBytes: z
        .number()
        .int()
        .positive()
        .max(100 * 1024 * 1024),
      mimeType: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/json",
      ]),
    })
    .strict(),
]);
export type StorageCapability = z.infer<typeof capabilitySchema>;

function mac(payload: string, secret: string) {
  if (secret.length < 32)
    throw new StorageFailure("STORAGE_NOT_CONFIGURED", 503);
  return createHmac("sha256", secret)
    .update(`ruvie-storage-v1:${payload}`)
    .digest();
}

export function signCapability(value: unknown, secret: string) {
  const parsed = capabilitySchema.parse(value);
  validateObjectKey(parsed.bucket, parsed.key);
  const payload = Buffer.from(JSON.stringify(parsed)).toString("base64url");
  return `${payload}.${mac(payload, secret).toString("base64url")}`;
}

export function verifyCapability(
  token: string | null,
  operation: "read" | "write",
  secret: string,
  now = Date.now(),
): StorageCapability {
  const denied = () => new StorageFailure("STORAGE_PERMISSION_INVALID", 403);
  if (!token || token.length > 4096 || !/^[\w-]+\.[\w-]+$/.test(token))
    throw denied();
  const [payload, signature] = token.split(".");
  const expected = mac(payload, secret);
  const supplied = Buffer.from(signature, "base64url");
  if (
    signature !== supplied.toString("base64url") ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw denied();
  try {
    const value = capabilitySchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    validateObjectKey(value.bucket, value.key);
    if (value.operation !== operation || value.exp <= now) throw denied();
    if (
      value.operation === "write" &&
      value.bucket !== STORAGE_BUCKETS.stagingUploads
    )
      throw denied();
    return value;
  } catch {
    throw denied();
  }
}
