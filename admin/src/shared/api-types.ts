export type ApiSuccess<T> = {
  data: T;
  meta: { requestId: string };
};

export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;
