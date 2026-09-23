type FailureRecord = {
  status?: unknown;
  name?: unknown;
  message?: unknown;
};

function asFailureRecord(value: unknown): FailureRecord | null {
  if (typeof value !== "object" || value === null) return null;
  return value as FailureRecord;
}

function failureMessage(error: unknown) {
  const value =
    error instanceof Error
      ? error.message
      : asFailureRecord(error)?.message;
  return typeof value === "string" ? value : "";
}

function failureStatus(error: unknown) {
  const status = asFailureRecord(error)?.status;
  return typeof status === "number" && Number.isInteger(status)
    ? status
    : undefined;
}

function isConfigurationFailure(error: unknown) {
  return /^(VERTEX_|INTERIOR_VALIDATION_RESPONSE_INVALID)/.test(
    failureMessage(error),
  );
}

export function isRetryableInteriorImageValidationFailure(error: unknown) {
  if (isConfigurationFailure(error)) return false;

  const status = failureStatus(error);
  return status === undefined || status === 429 || status >= 500;
}

export function getInteriorImageValidationFailureDetails(error: unknown) {
  const record = asFailureRecord(error);
  const name =
    error instanceof Error
      ? error.name
      : typeof record?.name === "string"
        ? record.name
        : "UnknownError";

  return {
    upstreamStatus: failureStatus(error),
    upstreamName: name,
    upstreamMessage: failureMessage(error)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500),
  };
}
