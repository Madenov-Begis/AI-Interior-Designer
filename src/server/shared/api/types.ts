export type ApiMeta = { requestId: string };

export type ApiSuccess<T> = { data: T; meta: ApiMeta };

export type ApiFailure = {
  error: { code: string; message: string; details?: unknown };
  meta: ApiMeta;
};
