import "server-only";
import { createStorage } from "./factory";
import type { StorageService } from "./types";

let storage: StorageService | undefined;
export function getStorage() {
  storage ??= createStorage(process.env);
  return storage;
}
