"use client";

import { useEffect } from "react";
import { captureException } from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);
  return (
    <html lang="ru">
      <body>
        <main>
          <h1>Не удалось открыть страницу</h1>
          <button type="button" onClick={reset}>
            Попробовать снова
          </button>
        </main>
      </body>
    </html>
  );
}
