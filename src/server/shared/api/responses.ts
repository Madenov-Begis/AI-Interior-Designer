import { captureMessage } from "@sentry/nextjs";
import { NextResponse } from "next/server";

import type { ApiFailure, ApiSuccess } from "./types.ts";

export function apiSuccess<T>(data: T, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json<ApiSuccess<T>>(
    { data, meta: { requestId } },
    init,
  );
  response.headers.set("x-request-id", requestId);
  return response;
}

export function apiError(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: unknown,
) {
  if (status >= 500)
    captureMessage(code, { level: "error", tags: { requestId } });
  const error =
    details === undefined ? { code, message } : { code, message, details };
  const response = NextResponse.json<ApiFailure>(
    { error, meta: { requestId } },
    { status },
  );
  response.headers.set("x-request-id", requestId);
  return response;
}
