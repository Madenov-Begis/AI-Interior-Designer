import { NextResponse } from "next/server";

export type ApiMeta = { requestId: string };
export type ApiSuccess<T> = { data: T; meta: ApiMeta };
export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
};

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
  const error =
    details === undefined ? { code, message } : { code, message, details };
  const response = NextResponse.json<ApiFailure>(
    { error, meta: { requestId } },
    { status },
  );
  response.headers.set("x-request-id", requestId);
  return response;
}
