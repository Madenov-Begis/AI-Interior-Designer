import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/server/features/auth/route-policy";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { serverEnv } from "@/server/shared/config/env";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const appUrl = serverEnv().APP_URL;
  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set(
    "next",
    safeReturnPath(request.nextUrl.searchParams.get("next")),
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_start", appUrl),
    );
  }

  return NextResponse.redirect(data.url);
}
