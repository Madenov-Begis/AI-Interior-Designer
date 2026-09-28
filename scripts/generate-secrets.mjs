import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const secrets = {
  AUTH_SESSION_SECRET: randomBytes(32).toString("hex"),
  STORAGE_SIGNING_SECRET: randomBytes(32).toString("hex"),
  ADMIN_TOKEN_SECRET: randomBytes(32).toString("hex"),
  ADMIN_ACCESS_CODE: randomBytes(16).toString("hex"),
  POSTGRES_PASSWORD: randomBytes(24).toString("hex"),
};

console.log("=== Сгенерированные криптостойкие секреты для Ruvie ===");
for (const [key, val] of Object.entries(secrets)) {
  console.log(`${key}=${val}`);
}

const targetFile = process.argv[2];
if (targetFile) {
  let content = "";
  try {
    content = await readFile(targetFile, "utf8");
    for (const [key, val] of Object.entries(secrets)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    }
    content = content.replace(/(DATABASE_URL=postgresql:\/\/[^:]+:)[^@]+(@.*)/g, `$1${secrets.POSTGRES_PASSWORD}$2`);
    content = content.replace(/(DIRECT_URL=postgresql:\/\/[^:]+:)[^@]+(@.*)/g, `$1${secrets.POSTGRES_PASSWORD}$2`);
    await writeFile(targetFile, content, "utf8");
    console.log(`\nУспешно обновлены секреты в файле: ${targetFile}`);
  } catch (err) {
    console.error(`\nНе удалось записать в ${targetFile}:`, err.message);
  }
}
