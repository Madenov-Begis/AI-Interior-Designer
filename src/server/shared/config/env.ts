import "server-only";

import { z } from "zod";
import { assertSafePaymentConfiguration } from "./payment.ts";

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
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    AI_PROVIDER: z.enum(["fake", "vertex"]).default("fake"),
    GENERATIONS_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    PAYMENT_PROVIDER: z.enum(["disabled", "mock"]).default("disabled"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    GOOGLE_CLOUD_PROJECT_ID: z.string().min(1).optional(),
    GOOGLE_CLOUD_LOCATION: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().min(1).optional(),
    GCP_PROJECT_NUMBER: z.string().regex(/^\d+$/).optional(),
    GCP_SERVICE_ACCOUNT_EMAIL: z.email().optional(),
    GCP_WORKLOAD_IDENTITY_POOL_ID: z.string().min(1).optional(),
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: z.string().min(1).optional(),
    GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE: z.url().optional(),
    TRIGGER_SECRET_KEY: z.string().min(1).optional(),
    SENTRY_DSN: z.url().optional(),
    ADMIN_ORIGINS: z.string().min(1).optional(),
    ADMIN_ACCESS_CODE: z.string().trim().min(5).max(128).optional(),
    ADMIN_TOKEN_SECRET: z.string().min(32).optional(),
    AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
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
    if (env.NODE_ENV === "production" && !env.AUTH_COOKIE_DOMAIN) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_COOKIE_DOMAIN"],
        message: "Обязателен общий production-domain для auth cookies",
      });
    }
    if (env.NODE_ENV === "production" && !env.SUPABASE_SERVICE_ROLE_KEY) {
      context.addIssue({
        code: "custom",
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
        message: "Обязателен для server-side Auth и Storage операций",
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
    if (env.AI_PROVIDER === "vertex") {
      const workloadIdentityFields = [
        env.GCP_PROJECT_NUMBER,
        env.GCP_SERVICE_ACCOUNT_EMAIL,
        env.GCP_WORKLOAD_IDENTITY_POOL_ID,
        env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
        env.GCP_WORKLOAD_IDENTITY_TOKEN_AUDIENCE,
      ];
      const workloadIdentityFieldCount =
        workloadIdentityFields.filter(Boolean).length;
      const hasWorkloadIdentity = workloadIdentityFieldCount === 4;

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
        !hasWorkloadIdentity &&
        !env.GOOGLE_APPLICATION_CREDENTIALS_JSON &&
        !env.GOOGLE_APPLICATION_CREDENTIALS
      )
        context.addIssue({
          code: "custom",
          path: ["GOOGLE_APPLICATION_CREDENTIALS_JSON"],
          message:
            "Для Vertex AI необходим полный набор Workload Identity Federation или локальные Google credentials",
        });
      if (workloadIdentityFieldCount > 0 && !hasWorkloadIdentity)
        context.addIssue({
          code: "custom",
          path: ["GCP_PROJECT_NUMBER"],
          message:
            "Набор переменных Workload Identity Federation заполнен не полностью",
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
