import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config.ts";

test("includes sharp native runtime files in server traces", () => {
  assert.deepEqual(nextConfig.outputFileTracingIncludes?.["/*"], [
    "node_modules/sharp/**/*",
    "node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
  ]);
});
