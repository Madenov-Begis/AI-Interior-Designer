import assert from "node:assert/strict";
import test from "node:test";
import en from "./locales/en.ts";
import ru from "./locales/ru.ts";
import uz from "./locales/uz.ts";

const dictionaries = [en, ru, uz];

function assertNoEmptyStrings(value: unknown, path = "dictionary"): void {
  if (typeof value === "string") {
    assert.notEqual(value.trim(), "", `${path} must not be empty`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoEmptyStrings(item, `${path}.${index}`),
    );
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      assertNoEmptyStrings(item, `${path}.${key}`),
    );
  }
}

test("landing dictionaries cover every supported locale", () => {
  assert.deepEqual(
    dictionaries.map((dictionary) => dictionary.locale),
    ["en", "ru", "uz"],
  );
});

test("translated collections keep the same shape", () => {
  for (const dictionary of dictionaries) {
    assert.equal(dictionary.hero.highlights.length, 3);
    assert.equal(dictionary.examples.items.length, 5);
    assert.equal(dictionary.process.steps.length, 3);
    assert.equal(dictionary.stories.items.length, 4);
    assert.equal(dictionary.workflow.items.length, 4);
    assert.equal(dictionary.faq.items.length, 7);
    assertNoEmptyStrings(dictionary);
  }
});
