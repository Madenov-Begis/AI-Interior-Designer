import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { z } from "zod";
import type { GoogleIdentity } from "./google-identity-operations.ts";

export const GOOGLE_OAUTH_COOKIE = "ruvie_google_oauth";
export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  sessionSecret: string;
  issuer: string;
};
const contextSchema = z.object({
  state: z.string(),
  nonce: z.string(),
  verifier: z.string(),
  next: z.string(),
  returnOrigin: z.url(),
  legalAcceptance: z.string(),
});
function client(config: GoogleOAuthConfig) {
  return new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.callbackUrl,
  );
}
function secret(config: GoogleOAuthConfig) {
  if (config.sessionSecret.length < 32)
    throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return new TextEncoder().encode(config.sessionSecret);
}
export async function startGoogleOAuth(
  config: GoogleOAuthConfig,
  input: { next: string; returnOrigin: string; legalAcceptance: string },
  now = Date.now(),
) {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL(
    client(config).generateAuthUrl({
      scope: ["openid", "email", "profile"],
      access_type: "online",
      prompt: "select_account",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: CodeChallengeMethod.S256,
    }),
  );
  url.searchParams.set("nonce", nonce);
  const cookie = await new SignJWT({ ...input, state, nonce, verifier })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(config.issuer)
    .setAudience("ruvie-oauth-context")
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + 600)
    .sign(secret(config));
  return { url: url.toString(), cookie };
}
export async function verifyGoogleContext(
  config: GoogleOAuthConfig,
  cookie: string | undefined,
  state: string | null,
  now = Date.now(),
) {
  if (!cookie || !state || cookie.length > 8192)
    throw new Error("OAUTH_STATE_INVALID");
  const { payload } = await jwtVerify(cookie, secret(config), {
    algorithms: ["HS256"],
    issuer: config.issuer,
    audience: "ruvie-oauth-context",
    currentDate: new Date(now),
  });
  const context = contextSchema.parse(payload);
  const expected = Buffer.from(context.state);
  const actual = Buffer.from(state);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new Error("OAUTH_STATE_INVALID");
  return context;
}
export async function exchangeGoogleCode(
  config: GoogleOAuthConfig,
  code: string,
  context: Awaited<ReturnType<typeof verifyGoogleContext>>,
): Promise<GoogleIdentity> {
  const oauth = client(config);
  const { tokens } = await oauth.getToken({
    code,
    codeVerifier: context.verifier,
    redirect_uri: config.callbackUrl,
  });
  if (!tokens.id_token) throw new Error("GOOGLE_ID_TOKEN_MISSING");
  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.clientId,
  });
  const payload = ticket.getPayload();
  // verifyIdToken проверяет подпись, issuer, audience и expiry; nonce связывает
  // подписанный Google token с конкретным браузерным OAuth-запросом.
  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true ||
    (payload as unknown as { nonce?: string }).nonce !== context.nonce
  )
    throw new Error("GOOGLE_IDENTITY_INVALID");
  return {
    subject: payload.sub,
    email: payload.email,
    givenName: payload.given_name,
    familyName: payload.family_name,
    name: payload.name,
    picture: payload.picture,
  };
}
