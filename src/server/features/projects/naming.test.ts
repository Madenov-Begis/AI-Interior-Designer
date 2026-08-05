import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROJECT_NAME, projectNameFromSourceFile } from "./naming.ts";

test("derives a stable project card name from the first source file", () => {
  assert.equal(
    projectNameFromSourceFile("  living-room.final.jpg  "),
    "living-room.final",
  );
  assert.equal(
    projectNameFromSourceFile("Кухня   после ремонта.webp"),
    "Кухня после ремонта",
  );
  assert.equal(projectNameFromSourceFile("folder/bedroom.png"), "bedroom");
  assert.equal(projectNameFromSourceFile(".jpg"), DEFAULT_PROJECT_NAME);
  assert.equal(projectNameFromSourceFile("x".repeat(140)), "x".repeat(120));
});
