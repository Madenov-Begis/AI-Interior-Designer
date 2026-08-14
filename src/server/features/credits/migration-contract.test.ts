import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationSql = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260729000000_add_credit_wallet_and_mock_payments/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

const creditPackageMigrationSql = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260812164500_add_credit_packages/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

const internalTablesSecurityMigrationSql = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260813170314_secure_internal_tables/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("wallet migration applies every schema, backfill, grant, and policy step atomically", () => {
  const sql = migrationSql.trim();

  assert.match(sql, /^BEGIN;\s/i);
  assert.match(sql, /\sCOMMIT;$/i);
  assert.ok(
    sql.indexOf('INSERT INTO "CreditWallet"') <
      sql.indexOf('INSERT INTO "CreditTransaction"'),
  );
  assert.ok(
    sql.indexOf('INSERT INTO "CreditTransaction"') < sql.lastIndexOf("COMMIT;"),
  );
});

test("signup journal backfill is derived from existing wallet rows and keeps owner-only reads", () => {
  const journalBackfill = migrationSql.slice(
    migrationSql.indexOf('INSERT INTO "CreditTransaction"'),
    migrationSql.indexOf("-- Set the active Vertex model"),
  );

  assert.match(journalBackfill, /FROM "CreditWallet"/);
  assert.doesNotMatch(journalBackfill, /FROM "Profile"/);
  assert.match(
    migrationSql,
    /grant select on public\."CreditWallet", public\."CreditTransaction", public\."PaymentOrder"\s+to authenticated;/i,
  );
  assert.doesNotMatch(
    migrationSql,
    /grant\s+[^;]*public\."PaymentEvent"[^;]*to authenticated/i,
  );
  for (const policy of [
    "credit_wallet_select_own",
    "credit_transaction_select_own",
    "payment_order_select_own",
  ]) {
    assert.match(migrationSql, new RegExp(`create policy "${policy}"`, "i"));
  }
});

test("credit package migration preserves the three existing offers", () => {
  assert.match(creditPackageMigrationSql, /CREATE TABLE "CreditPackage"/);
  assert.match(creditPackageMigrationSql, /'mini'[\s\S]*20[\s\S]*25000/);
  assert.match(creditPackageMigrationSql, /'standard'[\s\S]*60[\s\S]*69000/);
  assert.match(creditPackageMigrationSql, /'pro'[\s\S]*160[\s\S]*169000/);
  assert.match(creditPackageMigrationSql, /CHECK \("credits" > 0\)/);
  assert.match(creditPackageMigrationSql, /CHECK \("priceUzs" > 0\)/);
  assert.match(creditPackageMigrationSql, /CHECK \(NOT "popular" OR "active"\)/);
  assert.match(creditPackageMigrationSql, /CreditPackage_one_active_popular_key/);
});

test("internal Prisma tables are not exposed through the Supabase Data API", () => {
  for (const table of ["_prisma_migrations", "CreditPackage"]) {
    assert.match(
      internalTablesSecurityMigrationSql,
      new RegExp(
        `ALTER TABLE public\\."${table}" ENABLE ROW LEVEL SECURITY`,
        "i",
      ),
    );
    assert.match(
      internalTablesSecurityMigrationSql,
      new RegExp(
        `REVOKE ALL PRIVILEGES ON TABLE public\\."${table}"[\\s\\S]*FROM anon, authenticated, service_role`,
        "i",
      ),
    );
  }

  assert.match(
    internalTablesSecurityMigrationSql,
    /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES/i,
  );
});
