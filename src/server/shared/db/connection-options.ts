type DatabaseEnvironment = {
  DATABASE_URL: string;
  DATABASE_SSL_MODE?: string;
};

export function databaseConnectionOptions(env: DatabaseEnvironment) {
  const mode = env.DATABASE_SSL_MODE || "verify-full";
  if (!["verify-full", "disable"].includes(mode)) {
    throw new Error("Неизвестный DATABASE_SSL_MODE");
  }

  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("Некорректный DATABASE_URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL должен использовать PostgreSQL");
  }

  // pg может переопределить TLS из URL даже при переданном объекте ssl.
  // Единственный источник TLS-политики — DATABASE_SSL_MODE.
  for (const key of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "ssl",
    "uselibpqcompat",
  ]) {
    url.searchParams.delete(key);
  }
  if (url.searchParams.has("host") || url.searchParams.has("hostaddr")) {
    throw new Error("Переопределение хоста PostgreSQL в query запрещено");
  }

  if (mode === "disable") {
    if (
      !["localhost", "127.0.0.1", "[::1]", "postgres"].includes(url.hostname)
    ) {
      throw new Error(
        "TLS можно отключать только для loopback или Docker-сервиса postgres",
      );
    }
    return { connectionString: url.toString(), ssl: false as const };
  }

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true as const },
  };
}
