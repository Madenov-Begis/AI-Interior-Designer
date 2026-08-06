import assert from "node:assert/strict";
import test from "node:test";
import { currentUserFromAuthMe } from "./current-user.ts";

test("returns the compact user from the auth bootstrap response", () => {
  const payload = {
    user: {
      id: "3f9c6504-78da-4fe8-97ec-ae7195048837",
      name: "Test User",
      email: "user@example.com",
      avatarUrl: "https://example.com/avatar.jpg",
    },
    wallet: { balance: 70, generationCost: 4 },
  };

  assert.deepEqual(currentUserFromAuthMe(payload), payload.user);
});
