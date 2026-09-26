import { constants } from "node:fs";
import {
  mkdir,
  lstat,
  realpath,
  open,
  link,
  unlink,
  opendir,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { STORAGE_BUCKETS } from "../config/storage.ts";
import { signCapability, validateObjectKey } from "./capability.ts";
import { StorageFailure, storageResult, type StorageService } from "./types.ts";

export type FilesystemSettings = {
  root: string;
  publicOrigin: string;
  signingSecret: string;
};

export class FilesystemStorage implements StorageService {
  readonly settings: FilesystemSettings;
  constructor(settings: FilesystemSettings) {
    const origin = new URL(settings.publicOrigin);
    if (
      !path.isAbsolute(settings.root) ||
      path.parse(settings.root).root === settings.root ||
      settings.signingSecret.length < 32 ||
      !["https:", "http:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    ) {
      throw new StorageFailure("STORAGE_NOT_CONFIGURED", 503);
    }
    this.settings = { ...settings, publicOrigin: origin.origin };
  }

  private async root() {
    await mkdir(this.settings.root, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.settings.root);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new StorageFailure("STORAGE_INVALID_PATH", 400);
    const canonical = await realpath(this.settings.root);
    const cwd = await realpath(process.cwd());
    for (const forbidden of [
      cwd,
      ...["public", ".next", "src", ".git"].map((name) => path.join(cwd, name)),
    ]) {
      if (
        canonical === forbidden ||
        (forbidden !== cwd && canonical.startsWith(`${forbidden}${path.sep}`))
      )
        throw new StorageFailure("STORAGE_ROOT_NOT_PRIVATE", 503);
    }
    return canonical;
  }

  /** Удаляет только незавершённые временные файлы старше суток, не media. */
  async cleanupTemporaryUploads(now = Date.now(), limit = 100) {
    const root = await this.root();
    let removed = 0;
    async function walk(directory: string): Promise<void> {
      if (removed >= limit) return;
      const directoryStat = await lstat(directory).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!directoryStat?.isDirectory() || directoryStat.isSymbolicLink())
        return;
      const entries = await opendir(directory).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!entries) return;
      for await (const entry of entries) {
        if (removed >= limit) break;
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(filename);
        else if (
          entry.isFile() &&
          /^\.upload-[a-f0-9-]{36}$/.test(entry.name)
        ) {
          const stat = await lstat(filename).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (stat?.isFile() && stat.mtimeMs < now - 86400_000) {
            await unlink(filename).catch((error) => {
              if (error.code !== "ENOENT") throw error;
            });
            removed++;
          }
        }
      }
    }
    for (const bucket of Object.values(STORAGE_BUCKETS))
      await walk(path.join(root, bucket));
    return removed;
  }

  private async objectPath(bucket: string, key: string, create = false) {
    validateObjectKey(bucket, key);
    let parent = await this.root();
    const parts = [bucket, ...key.split("/")];
    const name = parts.pop()!;
    for (const part of parts) {
      parent = path.join(parent, part);
      if (create)
        await mkdir(parent, { mode: 0o700 }).catch((error) => {
          if (error.code !== "EEXIST") throw error;
        });
      const stat = await lstat(parent);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new StorageFailure("STORAGE_INVALID_PATH", 400);
    }
    return path.join(parent, name);
  }

  async ensurePrivateBucket(bucket: string) {
    validateObjectKey(bucket, "check");
    await this.objectPath(bucket, "check", true);
  }

  /** Сначала временный файл, затем link: атомарная публикация без перезаписи. */
  async writeStream(
    bucket: string,
    key: string,
    body: ReadableStream<Uint8Array>,
    expectedBytes: number,
    beforePublish?: () => Promise<void>,
    signal?: AbortSignal,
  ) {
    if (
      !Number.isSafeInteger(expectedBytes) ||
      expectedBytes <= 0 ||
      expectedBytes > 128 * 1024 * 1024
    )
      throw new StorageFailure("STORAGE_SIZE_INVALID", 413);
    const destination = await this.objectPath(bucket, key, true);
    const temporary = path.join(
      path.dirname(destination),
      `.upload-${randomUUID()}`,
    );
    const handle = await open(temporary, "wx", 0o600);
    const reader = body.getReader();
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    signal?.addEventListener("abort", cancel, { once: true });
    let total = 0;
    try {
      while (true) {
        signal?.throwIfAborted();
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > expectedBytes)
          throw new StorageFailure("STORAGE_SIZE_INVALID", 413);
        let offset = 0;
        while (offset < value.byteLength) {
          const { bytesWritten } = await handle.write(
            value,
            offset,
            value.byteLength - offset,
          );
          if (!bytesWritten)
            throw new StorageFailure("STORAGE_UNAVAILABLE", 503);
          offset += bytesWritten;
        }
      }
      if (total !== expectedBytes)
        throw new StorageFailure("STORAGE_SIZE_MISMATCH", 400);
      await handle.sync();
      await handle.close();
      await beforePublish?.();
      signal?.throwIfAborted();
      // Повторно проверяем каталоги перед публикацией.
      await this.objectPath(bucket, key);
      await link(temporary, destination);
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
      reader.releaseLock();
      await handle.close().catch(() => {});
      await unlink(temporary).catch(() => {});
    }
  }

  async openRead(bucket: string, key: string) {
    const filename = await this.objectPath(bucket, key);
    const handle = await open(
      filename,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 128 * 1024 * 1024)
        throw new StorageFailure("STORAGE_SIZE_INVALID", 413);
      return { handle, size: stat.size };
    } catch (error) {
      await handle.close();
      throw error;
    }
  }

  from(bucket: string): ReturnType<StorageService["from"]> {
    validateObjectKey(bucket, "check");
    const signedRead = async (
      key: string,
      expiresIn: number,
      options?: { download?: string },
    ) => {
      if (!Number.isInteger(expiresIn) || expiresIn <= 0 || expiresIn > 3600)
        throw new StorageFailure("STORAGE_EXPIRY_INVALID", 400);
      const token = signCapability(
        {
          v: 1,
          operation: "read",
          bucket,
          key,
          exp: Date.now() + expiresIn * 1000,
          ...(options?.download ? { download: options.download } : {}),
        },
        this.settings.signingSecret,
      );
      return {
        signedUrl: `${this.settings.publicOrigin}/api/storage/object?token=${token}`,
      };
    };
    return {
      upload: (key, body, options) =>
        storageResult(async () => {
          if (options.upsert !== false)
            throw new StorageFailure("STORAGE_OVERWRITE_FORBIDDEN", 409);
          await this.writeStream(
            bucket,
            key,
            new Blob([new Uint8Array(body)]).stream(),
            body.byteLength,
          );
          return { path: key };
        }),
      download: (key) =>
        storageResult(async () => {
          const { handle } = await this.openRead(bucket, key);
          try {
            return new Blob([new Uint8Array(await handle.readFile())]);
          } finally {
            await handle.close();
          }
        }),
      remove: (keys) =>
        storageResult(async () => {
          for (const key of keys) {
            try {
              const filename = await this.objectPath(bucket, key);
              const stat = await lstat(filename);
              if (!stat.isFile() || stat.isSymbolicLink())
                throw new StorageFailure("STORAGE_INVALID_PATH", 400);
              await unlink(filename);
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ENOENT")
                throw error;
            }
          }
          return null;
        }),
      createSignedUrl: (key, ttl, options) =>
        storageResult(() => signedRead(key, ttl, options)),
      createSignedUrls: (keys, ttl) =>
        storageResult(() =>
          Promise.all(
            keys.map(async (key) => ({
              path: key,
              ...(await signedRead(key, ttl)),
            })),
          ),
        ),
      createSignedUploadUrl: (key, permission) =>
        storageResult(async () => {
          if (
            bucket !== STORAGE_BUCKETS.stagingUploads ||
            permission.upsert !== false ||
            permission.expiresAt.getTime() <= Date.now() ||
            permission.expiresAt.getTime() > Date.now() + 2 * 60 * 60 * 1000
          )
            throw new StorageFailure("STORAGE_PERMISSION_INVALID", 400);
          const token = signCapability(
            {
              v: 1,
              operation: "write",
              bucket,
              key,
              exp: permission.expiresAt.getTime(),
              sizeBytes: permission.sizeBytes,
              mimeType: permission.mimeType,
            },
            this.settings.signingSecret,
          );
          return {
            signedUrl: `${this.settings.publicOrigin}/api/storage/upload?token=${token}`,
          };
        }),
    };
  }
}

export function fileResponseStream(
  handle: Awaited<ReturnType<FilesystemStorage["openRead"]>>["handle"],
) {
  return Readable.toWeb(
    handle.createReadStream({ autoClose: true }),
  ) as ReadableStream<Uint8Array>;
}
