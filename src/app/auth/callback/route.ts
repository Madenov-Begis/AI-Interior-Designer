import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { upsertProfileFromAuthUser } from "@/server/features/auth/current-user";
import { safeReturnPath } from "@/server/features/auth/route-policy";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const safeNext = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        try {
          await upsertProfileFromAuthUser(data.user);
          return NextResponse.redirect(
            new URL(safeNext, request.nextUrl.origin),
          );
        } catch {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            new URL("/login?error=profile_setup", request.nextUrl.origin),
          );
        }
      }
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=oauth_callback", request.nextUrl.origin),
  );
}
