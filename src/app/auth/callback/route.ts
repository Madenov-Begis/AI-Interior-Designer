import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { upsertProfileFromAuthUser } from "@/server/features/auth/current-user";
import { safeReturnPath } from "@/server/features/auth/route-policy";
import {
  clearSessionCookies,
  storeSessionCookies,
} from "@/server/shared/auth/session-cookies";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const safeNext = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const { session } = data;
      if (session.user) {
        try {
          await upsertProfileFromAuthUser(session.user);
          await storeSessionCookies(session);
          return NextResponse.redirect(
            new URL(safeNext, request.nextUrl.origin),
          );
        } catch {
          await clearSessionCookies();
          return NextResponse.redirect(
            new URL("/login?error=profile_setup", request.nextUrl.origin),
          );
        }
      }
    }
  }

  await clearSessionCookies();

  return NextResponse.redirect(
    new URL("/login?error=oauth_callback", request.nextUrl.origin),
  );
}
