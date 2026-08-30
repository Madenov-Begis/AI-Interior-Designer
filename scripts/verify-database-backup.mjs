import { readFile } from "node:fs/promises";
import pg from "pg";

const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const restoredUrl = process.env.RESTORED_DATABASE_URL;
if (!sourceUrl || !restoredUrl) {
  throw new Error("SUPABASE_DATABASE_URL and RESTORED_DATABASE_URL are required");
}

const ca = await readFile(
  new URL("../prisma/certs/supabase-root-2021.crt", import.meta.url),
  "utf8",
);
const source = new pg.Client({
  connectionString: sourceUrl,
  ssl: { ca, rejectUnauthorized: true },
});
const restored = new pg.Client({ connectionString: restoredUrl });

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function tableCounts(client) {
  const { rows: tables } = await client.query(`
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
    order by tablename
  `);
  const counts = {};
  for (const { tablename } of tables) {
    const { rows } = await client.query(
      `select count(*)::int as count from public.${quoteIdentifier(tablename)}`,
    );
    counts[tablename] = rows[0].count;
  }
  return counts;
}

try {
  await Promise.all([source.connect(), restored.connect()]);
  const [sourceCounts, restoredCounts] = await Promise.all([
    tableCounts(source),
    tableCounts(restored),
  ]);
  if (JSON.stringify(sourceCounts) !== JSON.stringify(restoredCounts)) {
    throw new Error(
      `Restored row counts differ: ${JSON.stringify({ sourceCounts, restoredCounts })}`,
    );
  }
  console.log(`Verified ${Object.keys(sourceCounts).length} restored public tables`);
} finally {
  await Promise.allSettled([source.end(), restored.end()]);
}
