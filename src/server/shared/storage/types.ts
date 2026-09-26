export type StorageResult<T> =
  { data: T; error: null } | { data: null; error: Error };

export type UploadPermission = {
  upsert: false;
  sizeBytes: number;
  mimeType: string;
  expiresAt: Date;
};

export interface StorageBucket {
  upload(
    path: string,
    body: Uint8Array,
    options: { contentType: string; cacheControl?: string; upsert: false },
  ): Promise<StorageResult<unknown>>;
  download(path: string): Promise<StorageResult<Blob>>;
  remove(paths: string[]): Promise<StorageResult<unknown>>;
  createSignedUrl(
    path: string,
    expiresIn: number,
    options?: { download?: string },
  ): Promise<StorageResult<{ signedUrl: string }>>;
  createSignedUrls(
    paths: string[],
    expiresIn: number,
  ): Promise<
    StorageResult<Array<{ path: string; signedUrl: string; error?: string }>>
  >;
  createSignedUploadUrl(
    path: string,
    permission: UploadPermission,
  ): Promise<StorageResult<{ signedUrl: string }>>;
}

export interface StorageService {
  from(bucket: string): StorageBucket;
  ensurePrivateBucket(
    bucket: string,
    maxBytes: number,
    mimeTypes: string[],
  ): Promise<void>;
}

export class StorageFailure extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "StorageFailure";
    this.code = code;
    this.status = status;
  }
}

export function safeStorageError(error: unknown): StorageFailure {
  if (error instanceof StorageFailure) return error;
  const code = (error as { code?: string } | null)?.code;
  if (code === "ENOENT") return new StorageFailure("STORAGE_NOT_FOUND", 404);
  if (code === "EEXIST")
    return new StorageFailure("STORAGE_ALREADY_EXISTS", 409);
  return new StorageFailure("STORAGE_UNAVAILABLE", 503);
}

export async function storageResult<T>(
  operation: () => Promise<T>,
): Promise<StorageResult<T>> {
  try {
    return { data: await operation(), error: null };
  } catch (error) {
    return { data: null, error: safeStorageError(error) };
  }
}
