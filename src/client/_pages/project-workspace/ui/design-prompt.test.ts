import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspaceSource = readFileSync(
  new URL("./design-workspace.tsx", import.meta.url),
  "utf8",
);
const draftSource = readFileSync(
  new URL("../model/use-generation-draft.ts", import.meta.url),
  "utf8",
);
const inspectorSource = readFileSync(
  new URL("./design-inspector.tsx", import.meta.url),
  "utf8",
);
const stylePickerSource = readFileSync(
  new URL("./style-picker.tsx", import.meta.url),
  "utf8",
);

test("workspace opens with an empty generation prompt", () => {
  assert.match(draftSource, /const \[prompt, setPrompt\] = useState\(""\)/);
  assert.match(workspaceSource, /const draft = useGenerationDraft\(\)/);
  assert.doesNotMatch(workspaceSource, /DEFAULT_PROMPT|project\.prompt \?\?/);
});

test("generation prompt and workspace selectors use labels without descriptions", () => {
  assert.match(inspectorSource, /Опишите желаемый результат/);
  assert.match(inspectorSource, /Необязательно/);
  assert.match(inspectorSource, /htmlFor="generation-prompt"/);
  assert.match(inspectorSource, /border-y border-border py-4/);
  assert.match(inspectorSource, /focus-visible:ring-0/);
  assert.doesNotMatch(inspectorSource, /minLength=\{3\}/);
  assert.doesNotMatch(inspectorSource, /maxLength=\{4000\}/);
  assert.doesNotMatch(inspectorSource, /aria-invalid/);
  assert.doesNotMatch(inspectorSource, /generation-prompt-error/);
  assert.doesNotMatch(inspectorSource, /Что изменить, добавить или сохранить/);
  assert.doesNotMatch(inspectorSource, /Уточняет назначение и эргономику интерьера/);
  assert.doesNotMatch(inspectorSource, /House/);
  assert.doesNotMatch(stylePickerSource, /Один выбор — без сложных настроек/);
  assert.doesNotMatch(workspaceSource, /Добавьте описание — минимум 3 символа/);
  assert.doesNotMatch(workspaceSource, /Сократите инструкцию до 4000 символов/);
});

test("generation action panel keeps the primary action compact", () => {
  assert.doesNotMatch(inspectorSource, /Стоимость генерации/);
  assert.doesNotMatch(inspectorSource, /GENERATION_REFUND_MESSAGE/);
  assert.doesNotMatch(inspectorSource, /availableGenerationsText/);
  assert.match(inspectorSource, /t\("Создать дизайн · \{cost\} кредита"/);
});
