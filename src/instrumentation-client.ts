import * as Sentry from "@sentry/nextjs";
import { sanitizeErrorEvent } from "./client/shared/lib/telemetry/sanitize";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanitizeErrorEvent,
});
