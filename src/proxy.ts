import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function adminCors(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/v1/admin")) return null;
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.ADMIN_ORIGIN ?? "http://localhost:5173";
  if (origin !== allowedOrigin) return null;
  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Idempotency-Key, X-Request-Id",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
  return headers;
}

export async function proxy(request: NextRequest) {
  const cors = adminCors(request);
  if (request.method === "OPTIONS" && cors)
    return new NextResponse(null, { status: 204, headers: cors });
  const response = NextResponse.next({ request });
  cors?.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
