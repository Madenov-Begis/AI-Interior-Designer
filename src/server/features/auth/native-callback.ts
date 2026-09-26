import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import { authCookieSecure } from "@/server/shared/auth/cookie-domain";
import {
  clearSessionCookies,
  storeSessionCookies,
} from "@/server/shared/auth/session-cookies";
import { googleOAuthConfig, nativeSessionConfig } from "./native-config";
import {
  exchangeGoogleCode,
  verifyGoogleContext,
  GOOGLE_OAUTH_COOKIE,
} from "./google-oauth";
import { resolveGoogleIdentity } from "./google-identity-operations";
import { createNativeSession } from "./native-session-operations";
import {
  consumeLegalAcceptance,
  isCurrentLegalAcceptance,
  LEGAL_ACCEPTANCE_COOKIE,
} from "./legal-acceptance";
import {
  safeReturnOrigin,
  safeReturnPath,
  isLocalDevelopmentOrigin,
} from "./route-policy";
import { getOrCreateEntryProject } from "@/server/features/projects/service";

export async function nativeGoogleCallback(request: NextRequest) {
  const env = serverEnv();
  let appUrl = env.APP_URL;
  let response: NextResponse;
  try {
    const config = googleOAuthConfig();
    const context = await verifyGoogleContext(
      config,
      request.cookies.get(GOOGLE_OAUTH_COOKIE)?.value,
      request.nextUrl.searchParams.get("state"),
    );
    appUrl = safeReturnOrigin(
      context.returnOrigin,
      env.APP_ORIGINS,
      env.APP_URL,
    );
    if (
      !isCurrentLegalAcceptance(context.legalAcceptance) ||
      !isCurrentLegalAcceptance(
        request.cookies.get(LEGAL_ACCEPTANCE_COOKIE)?.value,
      )
    )
      throw new Error("LEGAL_ACCEPTANCE_REQUIRED");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || request.nextUrl.searchParams.has("error"))
      throw new Error("OAUTH_CODE_MISSING");
    const identity = await exchangeGoogleCode(config, code, context);
    const profile = await resolveGoogleIdentity(getDb(), identity);
    await consumeLegalAcceptance(profile.id);
    const session = await createNativeSession(
      getDb(),
      profile.id,
      nativeSessionConfig(),
    );
    await storeSessionCookies(session);
    let destination = safeReturnPath(context.next);
    if (destination === "/app") {
      try {
        destination = `/app/${(await getOrCreateEntryProject(profile.id)).id}`;
      } catch {
        /* Обычная точка входа повторит создание проекта после входа. */
      }
    }
    const redirectUrl = new URL(destination, appUrl);
    if (isLocalDevelopmentOrigin(appUrl))
      redirectUrl.hash = new URLSearchParams({
        oauth_access_token: session.access_token,
        oauth_expires_in: String(session.expires_in),
      }).toString();
    response = NextResponse.redirect(redirectUrl);
  } catch {
    await clearSessionCookies();
    response = NextResponse.redirect(
      new URL("/login?error=oauth_callback", appUrl),
    );
  }
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecure(env.NODE_ENV, env.APP_URL),
    path: "/auth/callback",
    maxAge: 0,
  });
  return response;
}
