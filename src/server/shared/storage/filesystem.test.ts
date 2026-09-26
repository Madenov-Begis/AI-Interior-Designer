import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  mkdtemp,
  rm,
  mkdir,
  symlink,
  readdir,
  writeFile,
  utimes,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FilesystemStorage } from "./filesystem.ts";
import { createStorage } from "./factory.ts";

async function fixture(t: TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "ruvie-files-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const storage = new FilesystemStorage({
    root,
    publicOrigin: "https://storage.example.invalid",
    signingSecret: "test-only-secret".repeat(4),
  });
  return { root, storage };
}
const data = new TextEncoder().encode("test");
const options = { contentType: "image/webp", upsert: false as const };

test("одновременная запись одного ключа создаёт ровно один неизменяемый объект", async (t) => {
  const { storage } = await fixture(t);
  const bucket = storage.from("source-images");
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      bucket.upload("users/owner/file.webp", data, options),
    ),
  );
  assert.equal(results.filter((result) => !result.error).length, 1);
  assert.equal(
    results.filter(
      (result) => result.error?.message === "STORAGE_ALREADY_EXISTS",
    ).length,
    7,
  );
  assert.equal(
    await (await bucket.download("users/owner/file.webp")).data?.text(),
    "test",
  );
  assert.equal((await bucket.remove(["users/owner/file.webp"])).error, null);
  assert.equal((await bucket.remove(["users/owner/file.webp"])).error, null);
});

test("частичный, слишком большой и прерванный поток не публикует файл", async (t) => {
  const { root, storage } = await fixture(t);
  for (const size of [2, 8]) {
    await assert.rejects(
      storage.writeStream(
        "staging-uploads",
        "users/owner/file",
        new Blob([data]).stream(),
        size,
      ),
    );
  }
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    storage.writeStream(
      "staging-uploads",
      "users/owner/file",
      new Blob([data]).stream(),
      4,
      undefined,
      abort.signal,
    ),
  );
  await assert.rejects(
    storage.writeStream(
      "staging-uploads",
      "users/owner/file",
      new Blob([data]).stream(),
      4,
      async () => {
        throw new Error("Владелец заблокирован");
      },
    ),
  );
  assert.deepEqual(
    await readdir(path.join(root, "staging-uploads/users/owner")),
    [],
  );
});

test("симлинки не позволяют читать, записывать или удалять файлы вне root", async (t) => {
  const { root, storage } = await fixture(t);
  const outside = await mkdtemp(path.join(tmpdir(), "ruvie-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, "secret.webp"), "private");
  await mkdir(path.join(root, "source-images"));
  await symlink(outside, path.join(root, "source-images/users"));
  const bucket = storage.from("source-images");
  assert.ok((await bucket.download("users/secret.webp")).error);
  assert.ok((await bucket.upload("users/secret.webp", data, options)).error);
  assert.ok((await bucket.remove(["users/secret.webp"])).error);
  await symlink(
    path.join(outside, "secret.webp"),
    path.join(root, "source-images/linked.webp"),
  );
  assert.ok((await bucket.download("linked.webp")).error);
  assert.equal(
    await readFile(path.join(outside, "secret.webp"), "utf8"),
    "private",
  );
});

test("maintenance удаляет только старые временные файлы и не следует симлинкам", async (t) => {
  const { root, storage } = await fixture(t);
  await storage.ensurePrivateBucket("staging-uploads");
  const bucket = path.join(root, "staging-uploads");
  const old = path.join(bucket, ".upload-00000000-0000-0000-0000-000000000000");
  const fresh = path.join(
    bucket,
    ".upload-11111111-1111-1111-1111-111111111111",
  );
  await writeFile(old, "old");
  await writeFile(fresh, "fresh");
  await writeFile(path.join(bucket, "permanent.webp"), "keep");
  await utimes(old, new Date(0), new Date(0));
  assert.equal(await storage.cleanupTemporaryUploads(), 1);
  assert.deepEqual(
    (await readdir(bucket)).sort(),
    [path.basename(fresh), "permanent.webp"].sort(),
  );
  const external = await mkdtemp(path.join(tmpdir(), "ruvie-cleanup-"));
  t.after(() => rm(external, { recursive: true, force: true }));
  const sentinel = path.join(external, path.basename(old));
  await writeFile(sentinel, "keep");
  await utimes(sentinel, new Date(0), new Date(0));
  await symlink(external, path.join(root, "source-images"));
  assert.equal(await storage.cleanupTemporaryUploads(), 0);
  assert.equal(await readFile(sentinel, "utf8"), "keep");
});

test("конфигурация отвергает публичные каталоги, слабый ключ и HTTP в production", async (t) => {
  const { root } = await fixture(t);
  const env = {
    STORAGE_ROOT: root,
    STORAGE_PUBLIC_ORIGIN: "https://storage.example.invalid",
    STORAGE_SIGNING_SECRET: "test-secret".repeat(4),
    NODE_ENV: "production",
  };
  assert.ok(createStorage(env) instanceof FilesystemStorage);
  assert.throws(() =>
    createStorage({ ...env, STORAGE_ROOT: path.resolve("public/media") }),
  );
  assert.throws(() =>
    createStorage({
      ...env,
      STORAGE_PUBLIC_ORIGIN: "http://storage.example.invalid",
    }),
  );
  assert.throws(() =>
    createStorage({ ...env, STORAGE_SIGNING_SECRET: "short" }),
  );
  assert.throws(() => createStorage({ ...env, STORAGE_ROOT: "relative-path" }));
});
