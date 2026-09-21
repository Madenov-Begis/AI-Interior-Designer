import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../../next.config.ts";

test("includes sharp native runtime files in server traces", () => {
  assert.deepEqual(nextConfig.outputFileTracingIncludes?.["/*"], [
    "./node_modules/.pnpm/@img+sharp-libvips-*/node_modules/@img/**/*.so*",
  ]);
});

test("excludes local environment files from server traces", () => {
  assert.deepEqual(nextConfig.outputFileTracingExcludes?.["/*"], [
    "./.env*",
    "./admin/.env*",
  ]);
});
