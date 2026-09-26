import path from "node:path";
import { FilesystemStorage } from "./filesystem.ts";
import { StorageFailure, type StorageService } from "./types.ts";

export function createStorage(
  env: Record<string, string | undefined>,
): StorageService {
  if (
    !env.STORAGE_ROOT ||
    !env.STORAGE_PUBLIC_ORIGIN ||
    !env.STORAGE_SIGNING_SECRET
  )
    throw new StorageFailure("STORAGE_NOT_CONFIGURED", 503);
  const root = path.resolve(env.STORAGE_ROOT);
  for (const directory of ["public", ".next", "src", ".git"]) {
    const forbidden = path.resolve(directory);
    if (root === forbidden || root.startsWith(`${forbidden}${path.sep}`))
      throw new StorageFailure("STORAGE_ROOT_NOT_PRIVATE", 503);
  }
  if (root === process.cwd())
    throw new StorageFailure("STORAGE_ROOT_NOT_PRIVATE", 503);
  if (
    env.NODE_ENV === "production" &&
    !env.STORAGE_PUBLIC_ORIGIN.startsWith("https://")
  )
    throw new StorageFailure("STORAGE_HTTPS_REQUIRED", 503);
  return new FilesystemStorage({
    root: env.STORAGE_ROOT,
    publicOrigin: env.STORAGE_PUBLIC_ORIGIN,
    signingSecret: env.STORAGE_SIGNING_SECRET,
  });
}
