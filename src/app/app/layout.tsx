import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProtectedRouteGuard } from "@/features/auth/index.client";
import { LocalizedSkipLink } from "@/shared/providers";
import { LocalizedAppProvider } from "../_components/localized-app-provider";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LocalizedAppProvider>
      <LocalizedSkipLink />
      <ProtectedRouteGuard>{children}</ProtectedRouteGuard>
    </LocalizedAppProvider>
  );
}
