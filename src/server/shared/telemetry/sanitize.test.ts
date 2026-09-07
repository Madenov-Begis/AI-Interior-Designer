import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeErrorEvent } from "./sanitize.ts";

test("error telemetry strips private bodies, credentials, signed URLs and prompt text", () => {
  const event = sanitizeErrorEvent({
    type: undefined,
    message: "secret prompt",
    request: {
      url: "https://host/?token=secret",
      data: "secret image",
      headers: { authorization: "secret" },
    },
    extra: { prompt: "secret" },
    user: { email: "secret" },
    breadcrumbs: [{ message: "secret" }],
    tags: { requestId: "request-123", prompt: "secret" },
    exception: {
      values: [
        {
          type: "Error",
          value: "secret",
          stacktrace: {
            frames: [
              { filename: "https://host/app.js?token=secret", lineno: 4 },
            ],
          },
        },
      ],
    },
  });
  assert.ok(!JSON.stringify(event).includes("secret"));
  assert.equal(event.tags?.requestId, "request-123");
  assert.equal(
    event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.lineno,
    4,
  );
});
