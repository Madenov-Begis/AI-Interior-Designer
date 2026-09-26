import "server-only";
import { serverEnv } from "@/server/shared/config/env";

export function nativeSessionConfig() {
  const env = serverEnv();
  if (!env.AUTH_SESSION_SECRET) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return { secret: env.AUTH_SESSION_SECRET, issuer: env.APP_URL };
}
export function googleOAuthConfig() {
  const env = serverEnv();
  if (
    !env.GOOGLE_OAUTH_CLIENT_ID ||
    env.GOOGLE_OAUTH_CLIENT_ID === "local-preview.invalid" ||
    !env.GOOGLE_OAUTH_CLIENT_SECRET ||
    env.GOOGLE_OAUTH_CLIENT_SECRET === "local-preview-only" ||
    !env.GOOGLE_OAUTH_CALLBACK_URL ||
    !env.AUTH_SESSION_SECRET
  )
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_OAUTH_CALLBACK_URL,
    sessionSecret: env.AUTH_SESSION_SECRET,
    issuer: env.APP_URL,
  };
}
