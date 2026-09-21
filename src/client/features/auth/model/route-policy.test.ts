import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isProtectedPath, safeReturnPath } from "./route-policy.ts";

test("classifies only app route segments as private", () => {
  assert.equal(isProtectedPath("/app"), true);
  assert.equal(isProtectedPath("/app/project-1"), true);
  assert.equal(isProtectedPath("/admin"), false);
  assert.equal(isProtectedPath("/admin/users"), false);
  assert.equal(isProtectedPath("/application"), false);
  assert.equal(isProtectedPath("/administrator"), false);
  assert.equal(isProtectedPath("/"), false);
});

test("accepts only local safe return paths", () => {
  assert.equal(safeReturnPath("/app/project-1"), "/app/project-1");
  assert.equal(
    safeReturnPath("/app/project-1?panel=settings"),
    "/app/project-1?panel=settings",
  );
  assert.equal(safeReturnPath("//evil.example"), "/app");
  assert.equal(safeReturnPath("https://evil.example"), "/app");
  assert.equal(safeReturnPath("/app\nX-Header: bad"), "/app");
  assert.equal(safeReturnPath(null), "/app");
});

test("protected routes use a client guard and axios sends the session token", async () => {
  const [
    authClient,
    appLayout,
    homePage,
    localizedHomePage,
    loginPage,
    dashboardLayout,
    apiClient,
    tokenCookies,
    refreshRoute,
    proxy,
  ] = await Promise.all([
    readFile(new URL("../api/client.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../../../app/app/layout.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../../../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../../../../app/[locale]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../app/login/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../app/app/(dashboard)/layout.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../../shared/api/client.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../../shared/auth/tokens.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../app/api/v1/auth/refresh/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../../../proxy.ts", import.meta.url), "utf8"),
  ]);

  assert.match(authClient, /\/auth\/me/);
  assert.doesNotMatch(authClient, /supabase|onAuthStateChange|getClaims/);
  assert.match(appLayout, /ProtectedRouteGuard/);
  assert.doesNotMatch(
    homePage,
    /useCurrentAuthUser|auth\.getClaims|createSupabaseServerClient/,
  );
  assert.match(homePage, /redirect\("\/en"\)/);
  assert.match(localizedHomePage, /LandingPage/);
  assert.match(apiClient, /getAccessToken\(\)/);
  assert.doesNotMatch(apiClient, /getRefreshToken\(\)/);
  assert.match(apiClient, /\/auth\/refresh/);
  assert.match(apiClient, /Authorization/);
  assert.match(apiClient, /Accept-Language/);
  assert.match(apiClient, /NEXT_LOCALE/);
  assert.match(apiClient, /Bearer/);
  assert.match(tokenCookies, /from "js-cookie"/);
  assert.match(tokenCookies, /Cookies\.get/);
  assert.match(tokenCookies, /Cookies\.set/);
  assert.match(tokenCookies, /clearLegacySupabaseCookies/);
  assert.match(refreshRoute, /auth\.refreshSession/);
  assert.doesNotMatch(
    apiClient,
    /createBrowserClient|createSupabaseBrowserClient/,
  );
  assert.doesNotMatch(proxy, /getClaims|updateSupabaseSession|isProtectedPath/);
  assert.doesNotMatch(loginPage, /\/auth\/me/);
  assert.doesNotMatch(dashboardLayout, /\/auth\/me/);
});
