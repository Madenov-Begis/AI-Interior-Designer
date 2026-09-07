import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "./app/global.css";
import * as Sentry from "@sentry/react";
import { sanitizeErrorEvent } from "./shared/telemetry/sanitize";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanitizeErrorEvent,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
