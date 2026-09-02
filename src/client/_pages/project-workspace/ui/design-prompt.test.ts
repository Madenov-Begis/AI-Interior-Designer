import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspaceSource = readFileSync(
  new URL("./design-workspace.tsx", import.meta.url),
  "utf8",
);
const inspectorSource = readFileSync(
  new URL("./design-inspector.tsx", import.meta.url),
  "utf8",
);

test("workspace opens with an empty generation prompt", () => {
  assert.match(workspaceSource, /const \[prompt, setPrompt\] = useState\(""\)/);
  assert.doesNotMatch(workspaceSource, /DEFAULT_PROMPT|project\.prompt \?\?/);
});

test("generation prompt has a visible label and persistent guidance", () => {
  assert.match(inspectorSource, /Опишите желаемый результат/);
  assert.match(inspectorSource, /id="generation-prompt-help"/);
  assert.match(
    inspectorSource,
    /"generation-prompt-help generation-prompt-error"/,
  );
  assert.match(inspectorSource, /htmlFor="generation-prompt"/);
});
