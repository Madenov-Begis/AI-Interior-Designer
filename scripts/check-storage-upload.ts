import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { stageUploadBody } from "../src/client/shared/api/staged-upload.ts";

const args = new Set(process.argv.slice(2));
if (args.has("--help")) {
  console.log(
    "check-storage-upload --run [--create-bucket]: upload/download/delete an isolated 15 MiB probe; requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(0);
}
if (
  !args.has("--run") ||
  [...args].some((arg) => !["--run", "--create-bucket"].includes(arg))
)
  throw new Error("Explicit --run required; see --help");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Storage configuration missing");
const storage = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;
const bucket = "staging-uploads";
const maxBytes = 15 * 1024 * 1024;
const prefix = `release-probes/${randomUUID()}`;
const paths = [`${prefix}/image.png`, `${prefix}/too-large.png`];
let step = "bucket";
let cleanupNeeded = false;
const check = (condition: unknown) => {
  if (!condition) throw new Error(`Storage probe failed at ${step}`);
};
const digest = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
try {
  let info = await storage.getBucket(bucket);
  if (
    info.error &&
    args.has("--create-bucket") &&
    String(info.error.statusCode) === "404"
  ) {
    const created = await storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: maxBytes,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/json",
      ],
    });
    check(!created.error);
    info = await storage.getBucket(bucket);
  }
  check(
    info.data &&
      !info.data.public &&
      Number(info.data.file_size_limit) === maxBytes,
  );
  const source = await readFile(
    new URL("../public/images/landing/japandi-before.png", import.meta.url),
  );
  check(source.length <= maxBytes);
  // A decodable PNG padded to the exact boundary tests transfer size without
  // including any user media or creating an AI generation.
  const bytes = Buffer.concat([source, Buffer.alloc(maxBytes - source.length)]);
  check((await sharp(bytes).metadata()).format === "png");
  const form = new FormData();
  form.set("file", new File([bytes], "probe.png", { type: "image/png" }));
  step = "signed upload";
  cleanupNeeded = true;
  const staged = await stageUploadBody(
    "/projects/probe/source",
    form,
    async () => {
      const result = await storage
        .from(bucket)
        .createSignedUploadUrl(paths[0], { upsert: false });
      check(!result.error && result.data);
      return { id: "probe", url: result.data!.signedUrl };
    },
  );
  check(staged.uploads.length === 1 && JSON.stringify(staged).length < 1024);
  step = "signed download";
  const signed = await storage
    .from(bucket)
    .createSignedUrl(paths[0], 60, { download: "probe.png" });
  check(!signed.error && signed.data);
  const downloaded = await fetch(signed.data!.signedUrl, {
    signal: AbortSignal.timeout(120_000),
  });
  check(
    downloaded.ok &&
      digest(new Uint8Array(await downloaded.arrayBuffer())) === digest(bytes),
  );
  step = "private access";
  const publicUrl = storage.from(bucket).getPublicUrl(paths[0]).data.publicUrl;
  check(!(await fetch(publicUrl, { signal: AbortSignal.timeout(30_000) })).ok);
  step = "oversized rejection";
  const oversized = await storage
    .from(bucket)
    .createSignedUploadUrl(paths[1], { upsert: false });
  check(!oversized.error && oversized.data);
  const rejected = await fetch(oversized.data!.signedUrl, {
    method: "PUT",
    body: Buffer.alloc(maxBytes + 1),
    headers: { "content-type": "image/png", "x-upsert": "false" },
    signal: AbortSignal.timeout(120_000),
  });
  check(rejected.status >= 400 && rejected.status < 500);
  console.log(
    JSON.stringify({
      uploadedBytes: bytes.length,
      signedDownloadHashMatches: true,
      publicAccessDenied: true,
      oversizedRejected: true,
    }),
  );
} catch {
  console.error(
    `Storage probe failed at ${step}; credentials and signed URLs omitted`,
  );
  process.exitCode = 1;
} finally {
  if (cleanupNeeded) {
    const removed = await storage.from(bucket).remove(paths);
    const remaining = await storage.from(bucket).list(prefix);
    const clean =
      !removed.error && !remaining.error && remaining.data.length === 0;
    console.log(JSON.stringify({ probeFilesRemoved: clean }));
    if (!clean) process.exitCode = 1;
  }
}
