import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { getAdminOrigins } from "@/server/features/admin/cors";
import { exactOrigins } from "@/server/shared/security/cors";

const handleLocaleRouting = createMiddleware(routing);

function adminOrigins() {
  return getAdminOrigins(process.env.NODE_ENV, process.env.ADMIN_ORIGINS);
}

function appOrigins() {
  return exactOrigins(process.env.APP_ORIGINS, [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
}

function corsHeaders(origin: string) {
  return new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Idempotency-Key, X-Request-Id",
    "Access-Control-Expose-Headers": "Content-Disposition, X-Request-Id",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return handleLocaleRouting(request);
  }
  if (!request.nextUrl.pathname.startsWith("/api/v1")) {
    return NextResponse.next({ request });
  }
  const isAdminApi = request.nextUrl.pathname.startsWith("/api/v1/admin");
  const allowedOrigins = isAdminApi ? adminOrigins() : appOrigins();
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    const requestId =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    return NextResponse.json(
      {
        error: { code: "ORIGIN_FORBIDDEN", message: "Origin не разрешён" },
        meta: { requestId },
      },
      { status: 403, headers: { "x-request-id": requestId, Vary: "Origin" } },
    );
  }
  if (request.method === "OPTIONS") {
    if (!origin) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }
  const response = NextResponse.next({ request });
  if (origin)
    corsHeaders(origin).forEach((value, key) =>
      response.headers.set(key, value),
    );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
