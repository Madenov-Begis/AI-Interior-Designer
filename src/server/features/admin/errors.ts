export class AdminServiceError extends Error {
  readonly code: string;
  readonly status: 400 | 403 | 404 | 409 | 502;
  constructor(
    code: string,
    message: string,
    status: 400 | 403 | 404 | 409 | 502,
  ) {
    super(message);
    this.name = "AdminServiceError";
    this.code = code;
    this.status = status;
  }
}
