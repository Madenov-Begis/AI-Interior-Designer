import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@/shared/config";
import { LocalizedSkipLink } from "@/shared/providers";
import { LocalizedAppProvider } from "../_components/localized-app-provider";

export const metadata: Metadata = {
  title: `Вход — ${APP_NAME}`,
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <LocalizedAppProvider>
      <LocalizedSkipLink />
      {children}
    </LocalizedAppProvider>
  );
}
