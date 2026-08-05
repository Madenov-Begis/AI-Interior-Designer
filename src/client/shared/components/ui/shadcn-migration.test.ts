import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ui = (name: string) =>
  readFile(new URL(`./${name}.tsx`, import.meta.url), "utf8");

test("button and badge use class-variance-authority", async () => {
  const [button, badge] = await Promise.all([ui("button"), ui("badge")]);

  assert.match(button, /from "class-variance-authority"/);
  assert.match(badge, /from "class-variance-authority"/);
});

test("sheet uses the official Radix-backed implementation", async () => {
  const sheet = await ui("sheet");

  assert.match(sheet, /from "radix-ui"/);
  assert.doesNotMatch(sheet, /<dialog/);
  assert.match(sheet, /SheetContent/);
});

test("button keeps the existing non-submit default", async () => {
  const button = await ui("button");

  assert.match(button, /type = "button"/);
});

test("shared interactive patterns use shadcn primitives", async () => {
  const [accountMenu, projectsGrid] = await Promise.all([
    readFile(
      new URL("../../../widgets/app-header/account-menu.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../features/projects/ui/projects-grid.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(accountMenu, /DropdownMenuTrigger/);
  assert.match(accountMenu, /AvatarFallback/);
  assert.doesNotMatch(accountMenu, /<details/);

  assert.match(projectsGrid, /InputGroupInput/);
  assert.match(projectsGrid, /ToggleGroupItem/);
  assert.match(projectsGrid, /EmptyTitle/);
  assert.doesNotMatch(projectsGrid, /<details/);
});
