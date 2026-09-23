import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { upsertProfileFromAuthUser } from "@/server/features/auth/current-user";
import {
  decodeOAuthReturnState,
  isLocalDevelopmentOrigin,
  OAUTH_RETURN_STATE_COOKIE,
  safeReturnOrigin,
  safeReturnPath,
} from "@/server/features/auth/route-policy";
import {
  clearSessionCookies,
  storeSessionCookies,
} from "@/server/shared/auth/session-cookies";
import { serverEnv } from "@/server/shared/config/env";
import { consumeLegalAcceptance } from "@/server/features/auth/legal-acceptance";
import { authCookieDomain } from "@/server/shared/auth/cookie-domain";
import { getOrCreateEntryProject } from "@/server/features/projects/service";

function clearOAuthReturnState(
  response: NextResponse,
  nodeEnv: string,
  configuredDomain: string | undefined,
) {
  response.cookies.set(OAUTH_RETURN_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    path: "/",
    domain: authCookieDomain(nodeEnv, configuredDomain),
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const env = serverEnv();
  const returnState = decodeOAuthReturnState(
    request.cookies.get(OAUTH_RETURN_STATE_COOKIE)?.value,
  );
  const safeNext = safeReturnPath(
    request.nextUrl.searchParams.get("next") ?? returnState?.next ?? null,
  );
  const localFallback = isLocalDevelopmentOrigin(request.nextUrl.origin)
    ? request.nextUrl.origin
    : env.APP_URL;
  const appUrl = safeReturnOrigin(
    request.nextUrl.searchParams.get("returnOrigin") ??
      returnState?.returnOrigin ??
      null,
    env.APP_ORIGINS,
    localFallback,
  );

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const { session } = data;
      if (session.user) {
        try {
          const profile = await upsertProfileFromAuthUser(session.user);
          await consumeLegalAcceptance(session.user.id);
          await storeSessionCookies(session);
          let destination = safeNext;
          if (safeNext === "/app" && profile.status === "ACTIVE") {
            try {
              const project = await getOrCreateEntryProject(session.user.id);
              destination = `/app/${project.id}`;
            } catch {
              // Авторизация успешна; обычная точка входа повторит создание проекта.
            }
          }
          const redirectUrl = new URL(destination, appUrl);
          if (isLocalDevelopmentOrigin(appUrl)) {
            redirectUrl.hash = new URLSearchParams({
              oauth_access_token: session.access_token,
              oauth_expires_in: String(session.expires_in),
            }).toString();
          }
          return clearOAuthReturnState(
            NextResponse.redirect(redirectUrl),
            env.NODE_ENV,
            env.AUTH_COOKIE_DOMAIN,
          );
        } catch {
          await clearSessionCookies();
          return clearOAuthReturnState(
            NextResponse.redirect(
              new URL("/login?error=profile_setup", appUrl),
            ),
            env.NODE_ENV,
            env.AUTH_COOKIE_DOMAIN,
          );
        }
      }
    }
  }

  await clearSessionCookies();

  return clearOAuthReturnState(
    NextResponse.redirect(new URL("/login?error=oauth_callback", appUrl)),
    env.NODE_ENV,
    env.AUTH_COOKIE_DOMAIN,
  );
}
