"use client";

import { useMessages } from "next-intl";
import { useCallback } from "react";
import { appMessageKey, formatAppMessage } from "@/i18n/app-messages";

export function useAppText() {
  const messages = useMessages() as { App?: Record<string, string> };

  return useCallback(
    (source: string, values?: Record<string, string | number>) => {
      const template = messages.App?.[appMessageKey(source)] ?? source;
      return formatAppMessage(template, values);
    },
    [messages.App],
  );
}
