import { z } from "zod";
import { assertSafePaymentConfiguration } from "../features/payments/policy";

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: z.url(),
    APP_TIMEZONE: z.string().min(1).default("Asia/Tashkent"),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    AI_PROVIDER: z.enum(["fake", "vertex"]).default("fake"),
    PAYMENT_PROVIDER: z.enum(["disabled", "mock"]).default("disabled"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    GOOGLE_CLOUD_PROJECT_ID: z.string().min(1).optional(),
    GOOGLE_CLOUD_LOCATION: z.string().min(1).optional(),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().min(1).optional(),
    TRIGGER_SECRET_KEY: z.string().min(1).optional(),
    SENTRY_DSN: z.url().optional(),
  })
  .superRefine((env, context) => {
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
