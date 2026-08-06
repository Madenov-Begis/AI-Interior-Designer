import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@/shared/config";

export const metadata: Metadata = {
  title: `Вход — ${APP_NAME}`,
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
