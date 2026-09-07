import type { ErrorEvent } from "@sentry/react";

export function sanitizeErrorEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    message:
      event.message && /^[A-Z_]{1,80}$/.test(event.message)
        ? event.message
        : undefined,
    tags:
      typeof event.tags?.requestId === "string" &&
      /^[a-zA-Z0-9-]{1,80}$/.test(event.tags.requestId)
        ? { requestId: event.tags.requestId }
        : undefined,
    exception: event.exception
      ? {
          values: event.exception.values?.map((value) => ({
            type:
              value.type && /^[a-zA-Z0-9_]{1,80}$/.test(value.type)
                ? value.type
                : "Error",
            value: "Error details redacted",
            stacktrace: {
              frames: value.stacktrace?.frames?.map((frame) => ({
                filename:
                  frame.filename && !/storage|data:|blob:/i.test(frame.filename)
                    ? frame.filename.split(/[?#]/)[0]
                    : undefined,
                function: frame.function,
                lineno: frame.lineno,
                colno: frame.colno,
                in_app: frame.in_app,
              })),
            },
          })),
        }
      : undefined,
  };
}
