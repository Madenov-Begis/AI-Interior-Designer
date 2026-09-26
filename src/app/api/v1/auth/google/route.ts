import { NextResponse, type NextRequest } from "next/server";
import {
  authErrorUrl,
  safeReturnOrigin,
  safeReturnPath,
} from "@/server/features/auth/route-policy";
import { serverEnv } from "@/server/shared/config/env";
import {
  isCurrentLegalAcceptance,
  LEGAL_ACCEPTANCE_COOKIE,
  LEGAL_ACCEPTANCE_COOKIE_VALUE,
} from "@/server/features/auth/legal-acceptance";
import {
  authCookieDomain,
  authCookieSecure,
} from "@/server/shared/auth/cookie-domain";
import {
  startGoogleOAuth,
  GOOGLE_OAUTH_COOKIE,
} from "@/server/features/auth/google-oauth";
import { googleOAuthConfig } from "@/server/features/auth/native-config";

export async function GET(request: NextRequest) {
  const env = serverEnv();
  const appUrl = env.APP_URL;
  const returnOrigin = safeReturnOrigin(
    request.nextUrl.searchParams.get("returnOrigin"),
    env.APP_ORIGINS,
    appUrl,
  );
  const safeNext = safeReturnPath(request.nextUrl.searchParams.get("next"));
  if (
    !isCurrentLegalAcceptance(
      request.nextUrl.searchParams.get("legalAcceptance"),
    )
  ) {
    return NextResponse.redirect(authErrorUrl(returnOrigin, "legal_consent"));
  }
  let started: Awaited<ReturnType<typeof startGoogleOAuth>>;
  try {
    started = await startGoogleOAuth(googleOAuthConfig(), {
      next: safeNext,
      returnOrigin,
      legalAcceptance: LEGAL_ACCEPTANCE_COOKIE_VALUE,
    });
  } catch {
    return NextResponse.redirect(authErrorUrl(returnOrigin, "oauth_start"));
  }

  const response = NextResponse.redirect(started.url);
  response.cookies.set(GOOGLE_OAUTH_COOKIE, started.cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecure(env.NODE_ENV, env.APP_URL),
    path: "/auth/callback",
    maxAge: 600,
  });
  response.cookies.set(LEGAL_ACCEPTANCE_COOKIE, LEGAL_ACCEPTANCE_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecure(env.NODE_ENV, env.APP_URL),
    path: "/",
    domain: authCookieDomain(
      env.NODE_ENV,
      env.AUTH_COOKIE_DOMAIN,
      env.APP_URL,
    ),
    maxAge: 15 * 60,
  });
  return response;
}
