import assert from "node:assert/strict";
import test from "node:test";
import { CapacityError, Gate } from "./gate.ts";

test("ограничивает активные операции и очередь, передаёт слот ожидающему", async () => {
  const gate = new Gate(2, 1);
  const a = await gate.acquire(); const b = await gate.acquire();
  let started = false;
  const pending = gate.acquire().then((release) => { started = true; return release; });
  await assert.rejects(gate.acquire(), CapacityError);
  assert.equal(started, false);
  a(); a();
  const c = await pending;
  assert.equal(started, true);
  b(); c();
  await gate.run(async () => {});
});
test("ошибка операции освобождает место", async () => {
  const gate = new Gate(1, 0);
  await assert.rejects(gate.run(async () => { throw new Error("ошибка"); }));
  await gate.run(async () => {});
});
