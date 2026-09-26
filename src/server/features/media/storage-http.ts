import { STORAGE_BUCKETS } from "../../shared/config/storage.ts";
import {
  verifyCapability,
  type StorageCapability,
} from "../../shared/storage/capability.ts";
import {
  FilesystemStorage,
  fileResponseStream,
} from "../../shared/storage/filesystem.ts";
import {
  safeStorageError,
  StorageFailure,
} from "../../shared/storage/types.ts";

export type UploadRecord = {
  path: string;
  ownerId: string;
  sizeBytes: number;
  mimeType: string;
  expiresAt: Date;
};
export type StorageHttpDependencies = {
  storage: FilesystemStorage;
  origins: Set<string>;
  maxUploadBytes: number;
  // Возвращает только запись с активным владельцем и доступным owner-scoped target.
  findUpload(path: string): Promise<UploadRecord | null>;
  findMedia(
    bucket: string,
    path: string,
  ): Promise<{ sizeBytes: number; mimeType: string } | null>;
  now?: () => number;
};

function cors(request: Request, origins: Set<string>) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const origin = request.headers.get("origin");
  if (origin) {
    if (!origins.has(origin)) throw new StorageFailure("ORIGIN_FORBIDDEN", 403);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,PUT,OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type,Cache-Control,X-Upsert",
    );
    headers.set("Access-Control-Expose-Headers", "Content-Disposition");
  }
  return headers;
}

async function verifyUpload(
  cap: StorageCapability,
  deps: StorageHttpDependencies,
) {
  const now = deps.now?.() ?? Date.now();
  if (
    cap.operation !== "write" ||
    cap.bucket !== STORAGE_BUCKETS.stagingUploads ||
    cap.exp <= now
  )
    throw new StorageFailure("STORAGE_PERMISSION_INVALID", 403);
  const record = await deps.findUpload(cap.key);
  if (
    !record ||
    record.expiresAt.getTime() <= now ||
    record.expiresAt.getTime() !== cap.exp ||
    record.path !== cap.key ||
    !record.path.startsWith(`users/${record.ownerId}/staging/`) ||
    record.sizeBytes !== cap.sizeBytes ||
    record.mimeType !== cap.mimeType
  ) {
    throw new StorageFailure("UPLOAD_NOT_FOUND", 404);
  }
  if (record.sizeBytes > deps.maxUploadBytes)
    throw new StorageFailure("UPLOAD_TOO_LARGE", 413);
  return record;
}

/** Signed capability — явное разрешение; cookie/Bearer для прямой передачи не нужны. */
export async function handleStorageRequest(
  request: Request,
  operation: "read" | "write",
  deps: StorageHttpDependencies,
): Promise<Response> {
  let headers = new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Origin",
  });
  const requestId = crypto.randomUUID();
  try {
    headers = cors(request, deps.origins);
    headers.set("X-Request-Id", requestId);
    if (request.method === "OPTIONS") {
      if (!request.headers.get("origin"))
        throw new StorageFailure("ORIGIN_FORBIDDEN", 403);
      return new Response(null, { status: 204, headers });
    }
    if (
      (operation === "write" && request.method !== "PUT") ||
      (operation === "read" && !["GET", "HEAD"].includes(request.method))
    )
      throw new StorageFailure("METHOD_NOT_ALLOWED", 405);
    const cap = verifyCapability(
      new URL(request.url).searchParams.get("token"),
      operation,
      deps.storage.settings.signingSecret,
      deps.now?.(),
    );
    if (cap.operation === "write") {
      const record = await verifyUpload(cap, deps);
      if (!request.body) throw new StorageFailure("UPLOAD_EMPTY", 400);
      const mime = request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      if (
        mime !== record.mimeType ||
        ![null, "identity"].includes(request.headers.get("content-encoding"))
      )
        throw new StorageFailure("UPLOAD_TYPE_MISMATCH", 415);
      const length = request.headers.get("content-length");
      if (
        length !== null &&
        (!/^\d+$/.test(length) || Number(length) !== record.sizeBytes)
      )
        throw new StorageFailure("STORAGE_SIZE_MISMATCH", 400);
      await deps.storage.writeStream(
        cap.bucket,
        cap.key,
        request.body,
        record.sizeBytes,
        async () => {
          await verifyUpload(cap, deps);
        },
        AbortSignal.any([request.signal, AbortSignal.timeout(120_000)]),
      );
      return Response.json(
        { data: { uploaded: true }, meta: { requestId } },
        { status: 201, headers },
      );
    }
    const media = await deps.findMedia(cap.bucket, cap.key);
    if (!media) throw new StorageFailure("STORAGE_NOT_FOUND", 404);
    // Не допускаем исполнения загруженного активного содержимого на origin API.
    if (
      !["image/png", "image/jpeg", "image/webp", "application/json"].includes(
        media.mimeType,
      )
    )
      throw new StorageFailure("STORAGE_TYPE_INVALID", 415);
    const { handle, size } = await deps.storage.openRead(cap.bucket, cap.key);
    try {
      if (size !== media.sizeBytes)
        throw new StorageFailure("STORAGE_SIZE_MISMATCH", 503);
      headers.set("Content-Type", media.mimeType);
      headers.set("Content-Length", String(size));
      headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
      if (cap.download) {
        const filename = cap.download.replace(/[\r\n\x00-\x1f\x7f]/g, "");
        headers.set(
          "Content-Disposition",
          `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
        );
      }
      if (request.method === "HEAD") {
        await handle.close();
        return new Response(null, { headers });
      }
      return new Response(fileResponseStream(handle), { headers });
    } catch (error) {
      await handle.close();
      throw error;
    }
  } catch (error) {
    const safe = safeStorageError(error);
    headers.set("X-Request-Id", requestId);
    return Response.json(
      {
        error: {
          code: safe.code,
          message: "Не удалось получить доступ к файлу",
        },
        meta: { requestId },
      },
      { status: safe.status, headers },
    );
  }
}
