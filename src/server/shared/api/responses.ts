import { captureMessage } from "@sentry/nextjs";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import type { Locale } from "@/i18n/routing";
import {
  localeFromHeaders,
  localizeApiMessage,
} from "@/server/shared/i18n/api-locale";
import type { ApiFailure, ApiSuccess } from "./types.ts";

export function apiSuccess<T>(data: T, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json<ApiSuccess<T>>(
    { data, meta: { requestId } },
    init,
  );
  response.headers.set("x-request-id", requestId);
  return response;
}

function localizeValidationDetails(details: unknown, locale: Locale): unknown {
  if (locale === "ru" || details === null || details === undefined)
    return details;
  if (typeof details === "string")
    return localizeApiMessage(locale, "VALIDATION_ERROR", details);
  if (Array.isArray(details))
    return details.map((item) => localizeValidationDetails(item, locale));
  if (typeof details === "object")
    return Object.fromEntries(
      Object.entries(details).map(([key, value]) => [
        key,
        localizeValidationDetails(value, locale),
      ]),
    );
  return details;
}

export async function apiError(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: unknown,
  options?: { locale?: Locale },
) {
  if (status >= 500)
    captureMessage(code, { level: "error", tags: { requestId } });
  let locale = options?.locale;
  if (!locale) {
    try {
      locale = localeFromHeaders(await headers());
    } catch {
      locale = "en";
    }
  }
  const localizedMessage = localizeApiMessage(locale, code, message);
  const localizedDetails =
    code === "VALIDATION_ERROR"
      ? localizeValidationDetails(details, locale)
      : details;
  const error =
    localizedDetails === undefined
      ? { code, message: localizedMessage }
      : { code, message: localizedMessage, details: localizedDetails };
  const response = NextResponse.json<ApiFailure>(
    { error, meta: { requestId } },
    { status },
  );
  response.headers.set("x-request-id", requestId);
  return response;
}
