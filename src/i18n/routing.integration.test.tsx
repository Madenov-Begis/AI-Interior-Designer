import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { routing } from "./routing";

const handleLocaleRouting = createMiddleware(routing);

function redirectPath(acceptLanguage?: string) {
  const request = new NextRequest("https://ruvie.cc/", {
    headers: acceptLanguage ? { "accept-language": acceptLanguage } : undefined,
  });
  const location = handleLocaleRouting(request).headers.get("location");

  return location ? new URL(location).pathname : null;
}

describe("выбор локали next-intl для корневого маршрута", () => {
  test.each([
    ["uz-Latn-UZ,uz;q=0.9,en;q=0.8", "/uz"],
    ["ru-RU,ru;q=0.9,en;q=0.8", "/ru"],
    ["en-GB,en;q=0.9", "/en"],
    ["ru;q=0.4,uz;q=0.9,en;q=0.8", "/uz"],
  ])("учитывает регион и q-приоритет для %s", (header, expected) => {
    expect(redirectPath(header)).toBe(expected);
  });

  test.each([["de-DE,fr;q=0.8"], [undefined]])(
    "использует английский fallback для %s",
    (header) => {
      expect(redirectPath(header)).toBe("/en");
    },
  );
});
