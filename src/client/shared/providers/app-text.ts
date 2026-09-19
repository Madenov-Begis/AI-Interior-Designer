"use client";

import { useMessages } from "next-intl";
import { appMessageKey } from "@/i18n/app-messages";

export function useAppText() {
  const messages = useMessages() as { App?: Record<string, string> };

  return (source: string) => messages.App?.[appMessageKey(source)] ?? source;
}
