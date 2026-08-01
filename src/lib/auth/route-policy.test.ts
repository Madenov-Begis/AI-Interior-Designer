import assert from "node:assert/strict";
import test from "node:test";
import { authEntry, isProtectedPath, safeReturnPath } from "./route-policy.ts";

test("classifies only app and admin route segments as private", () => {
  assert.equal(isProtectedPath("/app"), true);
  assert.equal(isProtectedPath("/app/project-1"), true);
  assert.equal(isProtectedPath("/admin"), true);
  assert.equal(isProtectedPath("/admin/users"), true);
  assert.equal(isProtectedPath("/application"), false);
  assert.equal(isProtectedPath("/administrator"), false);
  assert.equal(isProtectedPath("/"), false);
});

test("accepts only local safe return paths", () => {
  assert.equal(safeReturnPath("/app/project-1"), "/app/project-1");
  assert.equal(
    safeReturnPath("/app/project-1?panel=settings"),
    "/app/project-1?panel=settings",
  );
  assert.equal(safeReturnPath("//evil.example"), "/app");
  assert.equal(safeReturnPath("https://evil.example"), "/app");
  assert.equal(safeReturnPath("/app\nX-Header: bad"), "/app");
  assert.equal(safeReturnPath(null), "/app");
});

test("maps verified auth state to the correct application entry", () => {
  assert.deepEqual(authEntry(true), {
    href: "/app",
    label: "Продолжить",
  });
  assert.deepEqual(authEntry(false), {
    href: "/login",
    label: "Войти",
  });
});
