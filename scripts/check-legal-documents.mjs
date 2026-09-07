import { readFile } from "node:fs/promises";

const files = ["docs/legal/privacy-policy.md", "docs/legal/public-offer.md"];
const forbidden = [
  /\[ДАТА\]/,
  /\[EMAIL\]/,
  /\[ТЕЛЕФОН\]/,
  /\[АДРЕС\]/,
  /\[ИНН \/ STIR\]/,
  /\[НАИМЕНОВАНИЕ/,
  /\[СТАТУС\]/,
  /\[УКАЗАТЬ/,
  /\[ХОСТИНГ \/ CDN\]/,
  /\[PAYME \/ CLICK/,
  /\[SENTRY,/,
  /ВАЖНО ДО ПУБЛИКАЦИИ/,
  /\(проект\)/,
  /ВРЕМЕННАЯ ЗАГЛУШКА/i,
  /временная заглушка/i,
  /уточняется до публичного запуска/i,
  /точный адрес уточняется/i,
  /\+998 00 000 00 00/,
];

const problems = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) problems.push(`${file}: ${pattern}`);
  }
}

if (problems.length) {
  console.error(
    "Юридические документы содержат непубликуемые поля:\n" +
      problems.join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log("Юридические документы заполнены и готовы к публикации.");
}
