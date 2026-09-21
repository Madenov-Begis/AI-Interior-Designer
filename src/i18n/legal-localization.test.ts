import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const documents = ["privacy-policy", "public-offer"] as const;

test("legal documents exist in every supported language", () => {
  for (const document of documents) {
    const russian = readFileSync(
      new URL(`../../docs/legal/${document}.md`, import.meta.url),
      "utf8",
    );
    const english = readFileSync(
      new URL(`../../docs/legal/${document}.en.md`, import.meta.url),
      "utf8",
    );
    const uzbek = readFileSync(
      new URL(`../../docs/legal/${document}.uz.md`, import.meta.url),
      "utf8",
    );

    const sectionCount = (source: string) => source.match(/^## \d+\./gm)?.length;
    assert.equal(sectionCount(english), sectionCount(russian));
    assert.equal(sectionCount(uzbek), sectionCount(russian));
    assert.doesNotMatch(english, /[А-Яа-яЁё]/);
    assert.doesNotMatch(uzbek, /[А-Яа-яЁё]/);
  }
});

test("legal route selects the document using the application locale", () => {
  const source = readFileSync(
    new URL("../app/_components/markdown-legal-document.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveAppLocale/);
  assert.match(source, /`\$\{document\}\.\$\{locale\}\.md`/);
  assert.match(source, /translated=\{locale !== "ru"\}/);
});
