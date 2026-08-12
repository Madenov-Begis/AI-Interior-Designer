import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { upsertProfileFromAuthUser } from "@/server/features/auth/current-user";
import {
  isLocalDevelopmentOrigin,
  safeReturnOrigin,
  safeReturnPath,
} from "@/server/features/auth/route-policy";
import {
  clearSessionCookies,
  storeSessionCookies,
} from "@/server/shared/auth/session-cookies";
import { serverEnv } from "@/server/shared/config/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const safeNext = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const env = serverEnv();
  const appUrl = safeReturnOrigin(
    request.nextUrl.searchParams.get("returnOrigin"),
    env.APP_ORIGINS,
    env.APP_URL,
  );

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const { session } = data;
      if (session.user) {
        try {
          await upsertProfileFromAuthUser(session.user);
          await storeSessionCookies(session);
          const redirectUrl = new URL(safeNext, appUrl);
          if (isLocalDevelopmentOrigin(appUrl)) {
            redirectUrl.hash = new URLSearchParams({
              oauth_access_token: session.access_token,
              oauth_refresh_token: session.refresh_token,
              oauth_expires_in: String(session.expires_in),
            }).toString();
          }
          return NextResponse.redirect(redirectUrl);
        } catch {
          await clearSessionCookies();
          return NextResponse.redirect(
            new URL("/login?error=profile_setup", appUrl),
          );
        }
      }
    }
  }

  await clearSessionCookies();

  return NextResponse.redirect(new URL("/login?error=oauth_callback", appUrl));
}
