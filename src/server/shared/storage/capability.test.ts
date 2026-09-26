import assert from "node:assert/strict";
import test from "node:test";
import {
  signCapability,
  verifyCapability,
  validateObjectKey,
} from "./capability.ts";

const secret = "test-storage-key-".repeat(4);
const value = {
  v: 1,
  operation: "read",
  bucket: "source-images",
  key: "users/owner/source.webp",
  exp: 10000,
};

test("разрешение привязано к объекту, операции, ключу подписи и сроку", () => {
  const token = signCapability(value, secret);
  assert.deepEqual(verifyCapability(token, "read", secret, 9000), value);
  assert.throws(() => verifyCapability(token, "write", secret, 9000));
  assert.throws(() => verifyCapability(token, "read", secret, 10000));
  assert.throws(() =>
    verifyCapability(token, "read", "other-key".repeat(8), 9000),
  );
  const [, signature] = token.split(".");
  const forged = Buffer.from(
    JSON.stringify({ ...value, key: "users/other/source.webp" }),
  ).toString("base64url");
  assert.throws(() =>
    verifyCapability(`${forged}.${signature}`, "read", secret, 9000),
  );
});

test("путь не допускает обход каталога, неизвестные buckets и служебные файлы", () => {
  for (const key of [
    "../private",
    "/etc/passwd",
    "users//file",
    "users/../file",
    "users\\file",
    "users/%2e%2e/file",
    "users/file\0",
    ".upload-123",
  ]) {
    assert.throws(() => validateObjectKey("source-images", key));
  }
  assert.throws(() => validateObjectKey("unknown", "file"));
  assert.throws(() => signCapability(value, "short"));
  assert.throws(() => verifyCapability("x".repeat(5000), "read", secret, 9000));
});

test("upload-разрешение не открывает запись в постоянный bucket", () => {
  const token = signCapability(
    { ...value, operation: "write", sizeBytes: 4, mimeType: "image/png" },
    secret,
  );
  assert.throws(() => verifyCapability(token, "write", secret, 9000));
});
