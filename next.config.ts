import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "standalone"
    ? { output: "standalone" as const }
    : {}),
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.pnpm/@img+sharp-libvips-*/node_modules/@img/**/*.so*",
    ],
  },
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./admin/.env*"],
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";
    const connectOrigins = new Set(["'self'"]);
    for (const value of [
      process.env.NEXT_PUBLIC_API_BASE_URL,
      process.env.NEXT_PUBLIC_SENTRY_DSN,
      process.env.STORAGE_PUBLIC_ORIGIN,
    ]) {
      if (value) {
        const url = new URL(value);
        connectOrigins.add(url.origin);
      }
    }
    if (isDevelopment) {
      connectOrigins.add("ws://localhost:*");
      connectOrigins.add("http://localhost:*");
    }
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${[...connectOrigins].join(" ")}`,
      "object-src 'none'",
      "worker-src 'self' blob:",
      ...(!isDevelopment ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
