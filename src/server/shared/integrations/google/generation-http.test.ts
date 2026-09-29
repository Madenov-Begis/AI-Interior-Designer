import assert from "node:assert/strict";
import test from "node:test";
import { generationHttp } from "./generation-http.ts";

test("транспорт сохраняет Retry-After и не повторяет 429, 503 и сетевые ошибки", async () => {
  for (const status of [429, 503, 0]) {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      if (!status) throw new TypeError("Соединение потеряно");
      return new Response(null, { status, headers: { "Retry-After": "12" } });
    };
    await assert.rejects(
      generationHttp(
        "https://example.invalid",
        new Headers(),
        {},
        1000,
        transport,
      ),
      (error: unknown) => {
        if (status) {
          assert.equal((error as { status: number }).status, status);
          assert.equal((error as { retryAfter: string }).retryAfter, "12");
        }
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});
