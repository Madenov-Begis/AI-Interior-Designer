import assert from "node:assert/strict";
import test from "node:test";
import { currentUserFromClaims } from "./claims.ts";

test("builds the current user from verified Supabase claims", () => {
  const user = currentUserFromClaims({
    iss: "https://project.supabase.co/auth/v1",
    sub: "3f9c6504-78da-4fe8-97ec-ae7195048837",
    aud: "authenticated",
    exp: 2_000_000_000,
    iat: 1_900_000_000,
    role: "authenticated",
    aal: "aal1",
    session_id: "2c04ce11-2e63-48ff-864f-dfd51dcd0fd4",
    email: "user@example.com",
    user_metadata: {
      full_name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
    },
  });

  assert.deepEqual(user, {
    id: "3f9c6504-78da-4fe8-97ec-ae7195048837",
    email: "user@example.com",
    user_metadata: {
      full_name: "Test User",
      avatar_url: "https://example.com/avatar.jpg",
    },
  });
});

test("rejects verified claims without a user id", () => {
  assert.equal(currentUserFromClaims({ email: "user@example.com" }), null);
});
