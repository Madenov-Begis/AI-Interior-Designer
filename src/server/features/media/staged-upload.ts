import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getDb } from "@/server/shared/db/prisma";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { STORAGE_BUCKETS } from "@/server/shared/config/storage";
import { getSystemLimits } from "@/server/shared/config/system-limits";

const bucket = STORAGE_BUCKETS.stagingUploads;
const targetPattern =
  /^\/(projects\/([a-f0-9-]{36})\/(source|references|visual-prompt|generations)|generations\/([a-f0-9-]{36})\/refinements)$/i;
export const stagedUploadSchema = z.object({
  target: z.string().regex(targetPattern),
  originalName: z.string().min(1).max(255),
  mimeType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/json",
  ]),
  sizeBytes: z.number().int().positive(),
});

export async function initializeUpload(
  userId: string,
  input: z.infer<typeof stagedUploadSchema>,
) {
  if (input.sizeBytes > getSystemLimits().maxUploadSizeBytes)
    throw new Error("UPLOAD_TOO_LARGE");
  const parts = targetPattern.exec(input.target)!;
  const db = getDb();
  if (parts[2]) {
    if (
      !(await db.project.findFirst({
        where: { id: parts[2], userId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new Error("UPLOAD_TARGET_NOT_FOUND");
  } else if (
    !(await db.generation.findFirst({
      where: {
        id: parts[4],
        userId,
        status: "SUCCEEDED",
        deletedAt: null,
        project: { deletedAt: null },
      },
      select: { id: true },
    }))
  )
    throw new Error("UPLOAD_TARGET_NOT_FOUND");
  const storage = getSupabaseAdmin().storage;
  const existingBucket = await storage.getBucket(bucket);
  if (!existingBucket.data) {
    const created = await storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: getSystemLimits().maxUploadSizeBytes,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/json",
      ],
    });
    if (created.error) {
      const concurrent = await storage.getBucket(bucket);
      if (!concurrent.data || concurrent.data.public)
        throw new Error("UPLOAD_INIT_FAILED");
    }
  } else if (existingBucket.data.public) throw new Error("UPLOAD_INIT_FAILED");
  const id = randomUUID();
  const path = `users/${userId}/staging/${id}`;
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // The signed upload capability lasts two hours. Never delete its destination
  // before it expires, otherwise the same capability could recreate an orphan.
  await db.$transaction(async (tx) => {
    await tx.storageUpload.create({
      data: { ...input, id, ownerId: userId, path, expiresAt },
    });
    await tx.storageDeletion.create({
      data: {
        bucket,
        path,
        nextAttemptAt: new Date(expiresAt.getTime() + 15 * 60_000),
      },
    });
  });
  const signed = await getSupabaseAdmin()
    .storage.from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.signedUrl)
    throw new Error("UPLOAD_INIT_FAILED");
  return { id, url: signed.data.signedUrl, expiresAt: expiresAt.toISOString() };
}

const bodySchema = z.object({
  fields: z.record(z.string(), z.array(z.string()).max(30)),
  uploads: z
    .array(
      z.object({
        field: z.enum(["file", "files", "overlay", "canvasState"]),
        id: z.uuid(),
      }),
    )
    .max(32),
});

export async function readUploadFormData(request: NextRequest, userId: string) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return request.formData();
  const body = bodySchema.parse(await request.json());
  const target = request.nextUrl.pathname.replace(/^\/api\/v1/, "");
  const form = new FormData();
  for (const [key, values] of Object.entries(body.fields))
    for (const value of values) form.append(key, value);
  const seen = new Set<string>();
  for (const upload of body.uploads) {
    if (seen.has(upload.id)) throw new Error("DUPLICATE_UPLOAD");
    seen.add(upload.id);
    const record = await getDb().storageUpload.findFirst({
      where: {
        id: upload.id,
        ownerId: userId,
        target,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record || !record.path.startsWith(`users/${userId}/staging/`))
      throw new Error("UPLOAD_NOT_FOUND");
    const result = await getSupabaseAdmin()
      .storage.from(bucket)
      .download(record.path);
    if (result.error || !result.data) throw new Error("UPLOAD_NOT_READY");
    if (
      result.data.size !== record.sizeBytes ||
      result.data.size > getSystemLimits().maxUploadSizeBytes
    )
      throw new Error("UPLOAD_SIZE_MISMATCH");
    // Existing source/reference/overlay validators verify magic bytes, dimensions
    // and decode images before any permanent MediaFile is attached.
    if (upload.field === "canvasState") {
      if (record.mimeType !== "application/json")
        throw new Error("UPLOAD_TYPE_MISMATCH");
      form.set("canvasState", await result.data.text());
    } else {
      form.append(
        upload.field,
        new File([result.data], record.originalName, { type: record.mimeType }),
      );
    }
  }
  return form;
}
