import { NextResponse, type NextRequest } from "next/server";
import {
  oauthCallbackUrl,
  safeReturnOrigin,
  safeReturnPath,
} from "@/server/features/auth/route-policy";
import { createSupabaseServerClient } from "@/server/shared/integrations/supabase/server";
import { serverEnv } from "@/server/shared/config/env";

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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth_start", appUrl));
  }

  return NextResponse.redirect(data.url);
}
