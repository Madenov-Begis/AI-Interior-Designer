import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  APP_TIMEZONE: z.string().min(1).default("Asia/Tashkent"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  AI_PROVIDER: z.enum(["fake", "vertex"]).default("fake"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().min(1).optional(),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).optional(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().min(1).optional(),
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.url().optional(),
}).superRefine((env, context) => {
  if (env.AI_PROVIDER === "vertex") {
    if (!env.GOOGLE_CLOUD_PROJECT_ID) context.addIssue({ code: "custom", path: ["GOOGLE_CLOUD_PROJECT_ID"], message: "Обязателен для Vertex AI" });
    if (!env.GOOGLE_CLOUD_LOCATION) context.addIssue({ code: "custom", path: ["GOOGLE_CLOUD_LOCATION"], message: "Обязателен для Vertex AI" });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(input);
}

let cachedEnv: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
