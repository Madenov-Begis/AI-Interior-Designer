import * as Sentry from "@sentry/nextjs";
import { sanitizeErrorEvent } from "./server/shared/telemetry/sanitize";

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: Boolean(process.env.SENTRY_DSN),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeErrorEvent,
  });
}

export const onRequestError = Sentry.captureRequestError;
