import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertProfileFromAuthUser } from "@/lib/auth/current-user";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        try {
          await upsertProfileFromAuthUser(data.user);
          return NextResponse.redirect(new URL(safeNext, request.nextUrl.origin));
        } catch {
          return NextResponse.redirect(new URL("/login?error=profile_setup", request.nextUrl.origin));
        }
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth_callback", request.nextUrl.origin));
}
