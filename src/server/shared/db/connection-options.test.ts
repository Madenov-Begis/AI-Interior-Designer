import assert from "node:assert/strict";
import test from "node:test";
import { databaseConnectionOptions } from "./connection-options.ts";

test("по умолчанию проверяется сертификат PostgreSQL", () => {
  const options = databaseConnectionOptions({
    DATABASE_URL: "postgresql://user:password@db.example.invalid/db",
  });
  assert.ok(options.ssl);
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
});

test("локальная база и Docker работают без TLS только при явном выборе", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "postgres"]) {
    const options = databaseConnectionOptions({
      DATABASE_URL: `postgresql://user:password@${host}/db`,
      DATABASE_SSL_MODE: "disable",
    });
    assert.equal(options.ssl, false);
  }
  assert.throws(
    () =>
      databaseConnectionOptions({
        DATABASE_URL: "postgresql://user:password@remote.invalid/db",
        DATABASE_SSL_MODE: "disable",
      }),
    /TLS/,
  );
});

test("параметры URL не ослабляют явную TLS-политику", () => {
  const options = databaseConnectionOptions({
    DATABASE_URL:
      "postgresql://user:password@db.invalid/db?sslmode=no-verify&ssl=false&sslrootcert=bad&uselibpqcompat=true&application_name=ruvie",
    DATABASE_SSL_MODE: "verify-full",
  });
  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
  assert.equal(
    new URL(options.connectionString).search,
    "?application_name=ruvie",
  );
});

test("ошибки подключения не раскрывают пароль и отвергают обход хоста", () => {
  assert.throws(
    () =>
      databaseConnectionOptions({
        DATABASE_URL:
          "postgresql://user:private-password@localhost/db?host=remote.invalid",
        DATABASE_SSL_MODE: "disable",
      }),
    /query/,
  );
  assert.throws(
    () =>
      databaseConnectionOptions({ DATABASE_URL: "not-a-url-private-password" }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes("private-password"),
  );
  assert.throws(
    () =>
      databaseConnectionOptions({
        DATABASE_URL: "https://example.invalid",
        DATABASE_SSL_MODE: "disable",
      }),
    /PostgreSQL/,
  );
  assert.throws(
    () =>
      databaseConnectionOptions({
        DATABASE_URL: "postgresql://localhost/db",
        DATABASE_SSL_MODE: "insecure",
      }),
    /DATABASE_SSL_MODE/,
  );
});
