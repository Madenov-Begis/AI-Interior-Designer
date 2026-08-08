import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const promptSource = readFileSync(
  new URL("./prompt.ts", import.meta.url),
  "utf8",
);

test("root and refinement prompts describe different operations", () => {
  assert.match(promptSource, /Создай фотореалистичный редизайн/);
  assert.match(promptSource, /не создавай новый дизайн с нуля/);
  assert.match(promptSource, /Выполни только изменения/);
  assert.match(promptSource, /размеры изображения/);
});

test("refinement prompt recognizes only newly supplied references", () => {
  assert.match(promptSource, /области доработки/);
  assert.match(
    promptSource,
    /только \$\{input\.referenceCount\} новых референсов/,
  );
});
