import { exactOrigins } from "./cors.ts";

export function allowedCookieOrigin(request: {
  headers: Headers;
  nextUrl: { origin: string };
}) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  return (
    exactOrigins(process.env.APP_ORIGINS, [request.nextUrl.origin]).has(
      origin,
    ) || origin === request.nextUrl.origin
  );
}
