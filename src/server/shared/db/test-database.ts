export const TIMEWEB_TEST_DATABASE_URL =
  "postgresql://ruvie_test:local-test-only@127.0.0.1:55432/ruvie_refactor_test";

/** Не позволяет тестам подключиться к production через URL или query override. */
export function requireIsolatedTestDatabase(
  connectionString: string | undefined,
) {
  if (!connectionString)
    throw new Error("Нужен TEST_DATABASE_URL отдельной локальной тестовой БД");
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Некорректный TEST_DATABASE_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/ruvie_refactor_test" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Тесты допускают только локальную ruvie_refactor_test без query-параметров",
    );
  }
  return connectionString;
}
