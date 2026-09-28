import "server-only";

import { z } from "zod";
import { assertSafePaymentConfiguration } from "./payment.ts";
import {
  isLocalHttpOrigin,
  isLocalOAuthCallback,
} from "@/server/shared/auth/cookie-domain";

const optionalString = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.url().optional(),
);

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.url(),
    APP_ORIGINS: z.string().min(1).optional(),
    APP_TIMEZONE: z.string().min(1).default("Asia/Tashkent"),
    MAX_PARALLEL_GENERATIONS: z.coerce.number().int().min(1).max(20).default(1),
    MAX_REFERENCE_IMAGES: z.coerce.number().int().min(0).max(30).default(10),
    MAX_REFERENCE_URLS: z.coerce.number().int().min(0).max(30).default(10),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(100).default(15),
    MAX_OUTPUT_WIDTH: z.coerce.number().int().min(256).max(8192).default(4096),
    MAX_OUTPUT_HEIGHT: z.coerce.number().int().min(256).max(8192).default(4096),
    AUTH_SESSION_SECRET: z.string().min(32).optional(),
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_OAUTH_CALLBACK_URL: z.url().optional(),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL_MODE: z.enum(["verify-full", "disable"]).default("verify-full"),
    DIRECT_URL: z.string().min(1),
    AI_PROVIDER: z.enum(["fake", "vertex"]).default("fake"),
    GENERATIONS_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    PAYMENT_PROVIDER: z.enum(["disabled", "mock"]).default("disabled"),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(1),
    WORKER_MODE: z.enum(["fixed", "adaptive"]).default("fixed"),
    WORKER_ADAPTIVE_INITIAL: z.coerce.number().int().min(1).max(100).default(10),
    WORKER_ADAPTIVE_MAX: z.coerce.number().int().min(1).max(100).default(20),
    WORKER_STARTS_PER_SECOND: z.coerce.number().positive().max(100).default(2),
    WORKER_INPUT_BUDGET_MB: z.coerce.number().positive().default(256),
    WORKER_MEMORY_MB: z.coerce.number().positive().optional(),
    WORKER_TEMP_BUDGET_MB: z.coerce.number().positive().default(5120),
    WORKER_IMAGE_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
    LOAD_TEST_MODE: z.enum(["true", "false"]).default("false"),
    FAKE_SCENARIO: z.enum(["normal", "delay", "burst", "429", "timeout"]).default("normal"),
    WORKER_HEARTBEAT_FILE: z
      .string()
      .min(1)
      .default("/tmp/ruvie-worker-heartbeat.json"),
    STORAGE_ROOT: z.string().min(1).optional(),
    STORAGE_PUBLIC_ORIGIN: z.url().optional(),
    STORAGE_SIGNING_SECRET: z.string().min(32).optional(),
    GOOGLE_CLOUD_PROJECT_ID: optionalString,
    GOOGLE_CLOUD_LOCATION: optionalString,
    GOOGLE_APPLICATION_CREDENTIALS: optionalString,
    GOOGLE_APPLICATION_CREDENTIALS_JSON: optionalString,
    SENTRY_DSN: optionalUrl,
    ADMIN_ORIGINS: z.string().min(1).optional(),
    ADMIN_ACCESS_CODE: z.string().trim().min(5).max(128).optional(),
    ADMIN_TOKEN_SECRET: z.string().min(32).optional(),
    AUTH_COOKIE_DOMAIN: optionalString,
  })
  .superRefine((env, context) => {
    const localPreview = isLocalHttpOrigin(env.APP_URL);
    const localCallback = isLocalOAuthCallback(
      env.APP_URL,
      env.GOOGLE_OAUTH_CALLBACK_URL,
    );
    for (const field of [
        "AUTH_SESSION_SECRET",
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET",
        "GOOGLE_OAUTH_CALLBACK_URL",
    ] as const) {
      if (!env[field])
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Обязателен для Google OAuth",
        });
    }
    if (
      env.NODE_ENV === "production" &&
      env.GOOGLE_OAUTH_CALLBACK_URL &&
      !env.GOOGLE_OAUTH_CALLBACK_URL.startsWith("https://") &&
      !localCallback
    )
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_OAUTH_CALLBACK_URL"],
        message: "Для production нужен HTTPS callback; HTTP допустим только для локального /auth/callback",
      });
    for (const field of [
        "STORAGE_ROOT",
        "STORAGE_PUBLIC_ORIGIN",
        "STORAGE_SIGNING_SECRET",
    ] as const) {
      if (!env[field])
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Обязателен для приватного файлового хранилища",
        });
    }
    if (env.NODE_ENV === "production" && !env.ADMIN_ORIGINS) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_ORIGINS"],
        message: "Обязателен exact allowlist origin для production-админки",
      });
    }
    if (env.NODE_ENV === "production" && !env.APP_ORIGINS) {
      context.addIssue({
        code: "custom",
        path: ["APP_ORIGINS"],
        message: "Обязателен exact allowlist origin для production-клиента",
      });
    }
    if (env.NODE_ENV === "production" && !localPreview && !env.AUTH_COOKIE_DOMAIN) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_COOKIE_DOMAIN"],
        message: "Обязателен общий production-domain для auth cookies",
      });
    }
    if (env.NODE_ENV === "production" && !env.ADMIN_ACCESS_CODE) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_ACCESS_CODE"],
        message: "Обязателен для production-входа администратора",
      });
    }
    if (env.NODE_ENV === "production" && !env.ADMIN_TOKEN_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["ADMIN_TOKEN_SECRET"],
        message: "Обязателен для подписи production admin-token",
      });
    }
    if (env.WORKER_ADAPTIVE_INITIAL > env.WORKER_ADAPTIVE_MAX) {
      context.addIssue({ code: "custom", path: ["WORKER_ADAPTIVE_INITIAL"], message: "Начальный предел выше максимального" });
    }
    if (env.FAKE_SCENARIO !== "normal" && (env.LOAD_TEST_MODE !== "true" || env.AI_PROVIDER !== "fake")) {
      context.addIssue({ code: "custom", path: ["FAKE_SCENARIO"], message: "Сценарии доступны только в тестовом fake-контуре" });
    }
    if (env.LOAD_TEST_MODE === "true" && env.AI_PROVIDER !== "fake") {
      context.addIssue({ code: "custom", path: ["LOAD_TEST_MODE"], message: "Нагрузочный контур требует fake" });
    }
    if (env.AI_PROVIDER === "vertex") {
      if (!env.GOOGLE_CLOUD_PROJECT_ID)
        context.addIssue({
          code: "custom",
          path: ["GOOGLE_CLOUD_PROJECT_ID"],
          message: "Обязателен для Vertex AI",
        });
      if (!env.GOOGLE_CLOUD_LOCATION)
        context.addIssue({
          code: "custom",
          path: ["GOOGLE_CLOUD_LOCATION"],
          message: "Обязателен для Vertex AI",
        });
      if (
        !env.GOOGLE_APPLICATION_CREDENTIALS_JSON &&
        !env.GOOGLE_APPLICATION_CREDENTIALS
      )
        context.addIssue({
          code: "custom",
          path: ["GOOGLE_APPLICATION_CREDENTIALS_JSON"],
          message:
            "Для Vertex AI нужны Google credentials",
        });
    }
    try {
      assertSafePaymentConfiguration({
        nodeEnv: env.NODE_ENV,
        aiProvider: env.AI_PROVIDER,
        paymentProvider: env.PAYMENT_PROVIDER,
      });
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message:
          error instanceof Error ? error.message : "MOCK_PAYMENTS_NOT_SAFE",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  return serverEnvSchema.parse(input);
}

let cachedEnv: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
