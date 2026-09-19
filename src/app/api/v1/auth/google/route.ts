import { NextResponse, type NextRequest } from "next/server";
import {
  authErrorUrl,
  oauthCallbackUrl,
  safeReturnOrigin,
  safeReturnPath,
} from "@/server/features/auth/route-policy";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { serverEnv } from "@/server/shared/config/env";
import {
  isCurrentLegalAcceptance,
  LEGAL_ACCEPTANCE_COOKIE,
  LEGAL_ACCEPTANCE_COOKIE_VALUE,
} from "@/server/features/auth/legal-acceptance";
import { authCookieDomain } from "@/server/shared/auth/cookie-domain";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const env = serverEnv();
  const appUrl = env.APP_URL;
  const returnOrigin = safeReturnOrigin(
    request.nextUrl.searchParams.get("returnOrigin"),
    env.APP_ORIGINS,
    appUrl,
  );
  const callbackUrl = oauthCallbackUrl(
    request.nextUrl.origin,
    safeReturnPath(request.nextUrl.searchParams.get("next")),
    returnOrigin,
  );
  if (
    !isCurrentLegalAcceptance(
      request.nextUrl.searchParams.get("legalAcceptance"),
    )
  ) {
    return NextResponse.redirect(authErrorUrl(returnOrigin, "legal_consent"));
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(authErrorUrl(returnOrigin, "oauth_start"));
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(LEGAL_ACCEPTANCE_COOKIE, LEGAL_ACCEPTANCE_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    domain: authCookieDomain(env.NODE_ENV, env.AUTH_COOKIE_DOMAIN),
    maxAge: 15 * 60,
  });
  return response;
}
