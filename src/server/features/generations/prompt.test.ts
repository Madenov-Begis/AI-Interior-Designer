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
  assert.match(promptSource, /formatPlacementRegions/);
  assert.match(
    promptSource,
    /только \$\{input\.referenceCount\} новых референсов/,
  );
});

test("room context is inserted after the user prompt for root and refinement", () => {
  assert.match(promptSource, /input\.prompt\.trim\(\)[\s\S]*if \(input\.room\)/);
  assert.match(promptSource, /Тип помещения: \$\{input\.room\.name\}/);
  assert.match(promptSource, /input\.room\.promptModifier/);
});

test("placement regions are frozen into the prompt as normalized coordinates", async () => {
  const { formatPlacementRegions } = await import("./placement-prompt.ts");
  const prompt = formatPlacementRegions([
    {
      left: 0.8,
      top: 0.75,
      width: 0.15,
      height: 0.2,
      color: "#afea4d",
      kind: "stroke",
    },
  ]);

  assert.match(prompt, /нижняя правая часть/);
  assert.match(prompt, /x=80\.0%–95\.0%/);
  assert.match(prompt, /y=75\.0%–95\.0%/);
  assert.match(prompt, /Не рисуй линии, круги, рамки/);
});
