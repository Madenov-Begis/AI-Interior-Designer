"use client";

import { useAppText } from "./app-text";

export function LocalizedSkipLink() {
  const t = useAppText();

  return (
    <a className="skip-link" href="#main-content">
      {t("Перейти к основному содержимому")}
    </a>
  );
}
