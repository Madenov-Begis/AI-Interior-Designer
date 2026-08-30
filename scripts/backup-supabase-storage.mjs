import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const EXPECTED_BUCKETS = [
  "branding",
  "generation-originals",
  "generation-results",
  "reference-images",
  "source-images",
  "visual-prompts",
];
const DOWNLOAD_CONCURRENCY = 6;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeObjectPath(value) {
  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => segment === ".." || !segment)
  ) {
    throw new Error(`Unsafe Storage object path: ${value}`);
  }
  return normalized;
}

async function downloadObject(storage, bucket, objectPath, outputRoot) {
  let data;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await storage.from(bucket).download(objectPath);
    if (!result.error) {
      data = result.data;
      break;
    }
    lastError = result.error;
  }
  if (!data) {
    throw new Error(
      `Cannot download ${bucket}/${objectPath}: ${lastError?.message ?? "unknown error"}`,
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const destination = path.join(outputRoot, bucket, ...objectPath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);

  return {
    bucket,
    path: objectPath,
    bytes: buffer.length,
    contentType: data.type || "application/octet-stream",
    sha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function verifyRestore(storage, entry) {
  if (!entry) throw new Error("Storage restore check requires at least one object");
  const temporaryPath = `_backup-restore-checks/${randomUUID()}/${path.basename(entry.path)}`;

  try {
    const { error: uploadError } = await storage
      .from(entry.bucket)
      .upload(temporaryPath, entry.buffer, {
        contentType: entry.contentType,
        upsert: false,
      });
    if (uploadError) throw new Error(`Restore upload failed: ${uploadError.message}`);

    const { data, error: downloadError } = await storage
      .from(entry.bucket)
      .download(temporaryPath);
    if (downloadError) throw new Error(`Restore download failed: ${downloadError.message}`);

    const restored = Buffer.from(await data.arrayBuffer());
    const restoredHash = createHash("sha256").update(restored).digest("hex");
    if (restoredHash !== entry.sha256) {
      throw new Error("Restored Storage object checksum does not match backup");
    }
  } finally {
    const { error } = await storage.from(entry.bucket).remove([temporaryPath]);
    if (error) throw new Error(`Cannot remove restore-check object: ${error.message}`);
  }
}

const outputRoot = path.resolve(process.argv[2] ?? ".backup/storage");
const restoreCheck = process.argv.includes("--restore-check");
const supabase = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const ca = await readFile(
  new URL("../prisma/certs/supabase-root-2021.crt", import.meta.url),
  "utf8",
);
const database = new pg.Client({
  connectionString: requiredEnv("SUPABASE_DATABASE_URL"),
  ssl: { ca, rejectUnauthorized: true },
});

await mkdir(outputRoot, { recursive: true });
const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) throw new Error(`Cannot list buckets: ${bucketsError.message}`);

const bucketNames = new Set(buckets.map((bucket) => bucket.name));
const missingBuckets = EXPECTED_BUCKETS.filter((bucket) => !bucketNames.has(bucket));
if (missingBuckets.length) {
  throw new Error(`Missing expected buckets: ${missingBuckets.join(", ")}`);
}

await database.connect();
let inventory;
try {
  const { rows } = await database.query(
    `select bucket_id as bucket, name as "objectPath"
     from storage.objects
     where bucket_id = any($1::text[])
     order by bucket_id, name`,
    [EXPECTED_BUCKETS],
  );
  inventory = rows.map(({ bucket, objectPath }) => ({
    bucket,
    objectPath: safeObjectPath(objectPath),
  }));
} finally {
  await database.end();
}

const downloadedObjects = await mapConcurrent(
  inventory,
  DOWNLOAD_CONCURRENCY,
  async ({ bucket, objectPath }, index) => {
    const downloaded = await downloadObject(
      supabase.storage,
      bucket,
      objectPath,
      outputRoot,
    );
    if ((index + 1) % 25 === 0 || index + 1 === inventory.length) {
      console.log(`Downloaded ${index + 1}/${inventory.length} Storage objects`);
    }
    return downloaded;
  },
);

const manifest = downloadedObjects.map((downloaded) => ({
  bucket: downloaded.bucket,
  path: downloaded.path,
  bytes: downloaded.bytes,
  contentType: downloaded.contentType,
  sha256: downloaded.sha256,
}));

if (restoreCheck) await verifyRestore(supabase.storage, downloadedObjects[0]);

await writeFile(
  path.join(path.dirname(outputRoot), "storage-manifest.json"),
  `${JSON.stringify({ createdAt: new Date().toISOString(), objects: manifest }, null, 2)}\n`,
);
console.log(`Backed up ${manifest.length} Storage objects`);
