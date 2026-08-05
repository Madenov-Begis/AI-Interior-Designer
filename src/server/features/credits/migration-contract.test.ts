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
