import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch } from "undici";
import { createPinnedLookup } from "./safe-fetch-lookup";

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

export class SafeFetchError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

function ipv4Number(value: string) {
  const parts = value.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return null;
  return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3];
}

function inCidr(value: number, base: string, bits: number) {
  const baseValue = ipv4Number(base);
  if (baseValue === null) return false;
  const size = 2 ** (32 - bits);
  return Math.floor(value / size) === Math.floor(baseValue / size);
}

function isBlockedIpv4(address: string) {
  const value = ipv4Number(address);
  if (value === null) return true;
  return [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ].some(([base, bits]) => inCidr(value, base as string, bits as number));
}

function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:"))
    return isBlockedIpv4(normalized.slice(7));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export async function assertSafeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafeFetchError("INVALID_URL", "Некорректная ссылка");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new SafeFetchError(
      "UNSAFE_URL",
      "Разрешены только HTTP и HTTPS ссылки",
    );
  if (url.username || url.password)
    throw new SafeFetchError(
      "UNSAFE_URL",
      "Ссылки с логином или паролем запрещены",
    );
  if (
    url.port &&
    !(
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    )
  ) {
    throw new SafeFetchError(
      "UNSAFE_URL",
      "Нестандартные сетевые порты запрещены",
    );
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new SafeFetchError("UNSAFE_URL", "Внутренние адреса запрещены");
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((item) => isBlockedIp(item.address))
  ) {
    throw new SafeFetchError(
      "UNSAFE_URL",
      "Ссылка ведёт во внутреннюю или служебную сеть",
    );
  }
  return { url, addresses };
}

async function readLimitedBody(
  response: Awaited<ReturnType<typeof fetch>>,
  maxBytes: number,
) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes)
    throw new SafeFetchError(
      "REMOTE_FILE_TOO_LARGE",
      "Удалённый файл превышает допустимый размер",
    );
  if (!response.body)
    throw new SafeFetchError(
      "REMOTE_EMPTY_RESPONSE",
      "Удалённый сервер вернул пустой ответ",
    );

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new SafeFetchError(
        "REMOTE_FILE_TOO_LARGE",
        "Удалённый файл превышает допустимый размер",
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

export async function safeDownload(value: string) {
  let current = await assertSafeUrl(value);
  const deadline = Date.now() + TIMEOUT_MS;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw new SafeFetchError(
        "REMOTE_TIMEOUT",
        "Удалённый сервер не ответил за 15 секунд",
      );
    const target = current.addresses[0];
    const dispatcher = new Agent({
      connect: {
        lookup: createPinnedLookup(target),
      },
    });
    try {
      const response = await fetch(current.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(remaining),
        dispatcher,
        headers: {
          "user-agent": "AI-Interior-Designer/1.0",
          accept: "image/avif,image/webp,image/png,image/jpeg,text/html;q=0.8",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects === MAX_REDIRECTS)
          throw new SafeFetchError(
            "TOO_MANY_REDIRECTS",
            "Слишком много перенаправлений",
          );
        const location = response.headers.get("location");
        if (!location)
          throw new SafeFetchError(
            "INVALID_REDIRECT",
            "Удалённый сервер вернул некорректное перенаправление",
          );
        await response.body?.cancel();
        current = await assertSafeUrl(
          new URL(location, current.url).toString(),
        );
        continue;
      }
      if (!response.ok)
        throw new SafeFetchError(
          "REMOTE_HTTP_ERROR",
          `Удалённый сервер вернул HTTP ${response.status}`,
        );

      const contentType =
        response.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() || "application/octet-stream";
      const isHtml =
        contentType === "text/html" || contentType === "application/xhtml+xml";
      return {
        finalUrl: current.url.toString(),
        contentType,
        body: await readLimitedBody(
          response,
          isHtml ? MAX_HTML_BYTES : MAX_IMAGE_BYTES,
        ),
        isHtml,
      };
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      throw new SafeFetchError(
        "REMOTE_FETCH_FAILED",
        "Не удалось загрузить ссылку",
      );
    } finally {
      await dispatcher.close();
    }
  }
  throw new SafeFetchError(
    "TOO_MANY_REDIRECTS",
    "Слишком много перенаправлений",
  );
}
