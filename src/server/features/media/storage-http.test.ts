import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FilesystemStorage } from "../../shared/storage/filesystem.ts";
import {
  handleStorageRequest,
  type StorageHttpDependencies,
  type UploadRecord,
} from "./storage-http.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "ruvie-storage-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const storage = new FilesystemStorage({
    root,
    publicOrigin: "https://api.example.invalid",
    signingSecret: "test-storage-secret".repeat(3),
  });
  const record: UploadRecord = {
    path: "users/owner/staging/upload",
    ownerId: "owner",
    sizeBytes: 4,
    mimeType: "image/webp",
    expiresAt: new Date(Date.now() + 60_000),
  };
  const deps: StorageHttpDependencies = {
    storage,
    origins: new Set(["https://app.example.invalid"]),
    maxUploadBytes: 100,
    findUpload: async () => record,
    findMedia: async () => ({ sizeBytes: 4, mimeType: "image/webp" }),
  };
  const signed = await storage
    .from("staging-uploads")
    .createSignedUploadUrl(record.path, { ...record, upsert: false });
  assert.ok(signed.data);
  const url = signed.data.signedUrl;
  const request = (body = "test", headers: Record<string, string> = {}) =>
    new Request(url, {
      method: "PUT",
      body,
      headers: {
        "content-type": "image/webp",
        origin: "https://app.example.invalid",
        ...headers,
      },
    });
  return { deps, record, request, url };
}

test("staged PUT → серверное чтение → подписанный GET/HEAD сохраняют байты и приватные заголовки", async (t) => {
  const { deps, record, request } = await fixture(t);
  const upload = await handleStorageRequest(request(), "write", deps);
  assert.equal(upload.status, 201);
  assert.equal(
    upload.headers.get("access-control-allow-origin"),
    "https://app.example.invalid",
  );
  assert.equal(
    (await handleStorageRequest(request(), "write", deps)).status,
    409,
  );
  const read = await deps.storage.from("staging-uploads").download(record.path);
  assert.equal(await read.data?.text(), "test");
  const signed = await deps.storage
    .from("staging-uploads")
    .createSignedUrl(record.path, 60, { download: "Фото.webp" });
  assert.ok(signed.data);
  const response = await handleStorageRequest(
    new Request(signed.data.signedUrl),
    "read",
    deps,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.match(
    response.headers.get("content-disposition")!,
    /filename\*=UTF-8''/,
  );
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(await response.text(), "test");
  const head = await handleStorageRequest(
    new Request(signed.data.signedUrl, { method: "HEAD" }),
    "read",
    deps,
  );
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "4");
  assert.equal(await head.text(), "");
});

test("чужой владелец, удалённый target, просрочка, MIME и размер блокируют upload", async (t) => {
  const { deps, record, request } = await fixture(t);
  for (const changed of [
    null,
    { ...record, ownerId: "other" },
    { ...record, expiresAt: new Date(0) },
  ]) {
    const response = await handleStorageRequest(request(), "write", {
      ...deps,
      findUpload: async () => changed,
    });
    assert.equal(response.status, 404);
  }
  assert.equal(
    (
      await handleStorageRequest(request(), "write", {
        ...deps,
        maxUploadBytes: 2,
      })
    ).status,
    413,
  );
  assert.equal(
    (
      await handleStorageRequest(
        request("test", { "content-type": "text/html" }),
        "write",
        deps,
      )
    ).status,
    415,
  );
  assert.equal(
    (await handleStorageRequest(request("too-large"), "write", deps)).status,
    413,
  );
  assert.equal(
    (await handleStorageRequest(request("x"), "write", deps)).status,
    400,
  );
  assert.equal(
    (
      await handleStorageRequest(request(), "write", {
        ...deps,
        now: () => record.expiresAt.getTime(),
      })
    ).status,
    403,
  );
  assert.equal(
    (await deps.storage.from("staging-uploads").download(record.path)).error
      ?.message,
    "STORAGE_NOT_FOUND",
  );
});

test("отзыв разрешения во время передачи предотвращает публикацию", async (t) => {
  const { deps, request, record } = await fixture(t);
  let reads = 0;
  const response = await handleStorageRequest(request(), "write", {
    ...deps,
    findUpload: async () => (++reads === 1 ? record : null),
  });
  assert.equal(response.status, 404);
  assert.ok(
    (await deps.storage.from("staging-uploads").download(record.path)).error,
  );
});

test("неверная подпись отвергается до БД; CORS допускает только известные origins", async (t) => {
  const { deps, request, url } = await fixture(t);
  const invalid = new Request(
    "https://api.example.invalid/api/storage/upload?token=invalid",
    { method: "PUT", body: "test" },
  );
  const response = await handleStorageRequest(invalid, "write", {
    ...deps,
    findUpload: async () => {
      throw new Error("Не должно вызываться");
    },
  });
  assert.equal(response.status, 403);
  assert.equal(
    (
      await handleStorageRequest(
        request("test", { origin: "https://evil.invalid" }),
        "write",
        deps,
      )
    ).status,
    403,
  );
  const preflight = await handleStorageRequest(
    new Request(url, {
      method: "OPTIONS",
      headers: { origin: "https://app.example.invalid" },
    }),
    "write",
    deps,
  );
  assert.equal(preflight.status, 204);
  assert.match(
    preflight.headers.get("access-control-allow-headers")!,
    /X-Upsert/,
  );
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
});

test("удаление media-записи отзывает доступ по ранее выданному URL", async (t) => {
  const { deps, record, request } = await fixture(t);
  await handleStorageRequest(request(), "write", deps);
  const signed = await deps.storage
    .from("staging-uploads")
    .createSignedUrl(record.path, 60);
  assert.ok(signed.data);
  const response = await handleStorageRequest(
    new Request(signed.data.signedUrl),
    "read",
    { ...deps, findMedia: async () => null },
  );
  assert.equal(response.status, 404);
});
