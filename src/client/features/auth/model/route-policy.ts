const PROTECTED_SEGMENTS = ["/app"];
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isProtectedPath(pathname: string) {
  return PROTECTED_SEGMENTS.some(
    (segment) => pathname === segment || pathname.startsWith(`${segment}/`),
  );
}

export function safeReturnPath(value: string | null, fallback = "/app") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return fallback;
  }
  return value;
}
