import assert from "node:assert/strict";
import test from "node:test";
import { currentUserFromAuthMe } from "./current-user.ts";

test("builds a local current-user model from the auth API", () => {
  assert.deepEqual(
    currentUserFromAuthMe({
      id: "3f9c6504-78da-4fe8-97ec-ae7195048837",
      email: "user@example.com",
      profile: {
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
    }),
    {
      id: "3f9c6504-78da-4fe8-97ec-ae7195048837",
      email: "user@example.com",
      user_metadata: {
        full_name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
      },
    },
  );
});

test("falls back to the profile name parts", () => {
  const user = currentUserFromAuthMe({
    id: "user-id",
    profile: { firstName: "Ada", lastName: "Lovelace" },
  });

  assert.equal(user.user_metadata.full_name, "Ada Lovelace");
  assert.equal(user.email, null);
});
