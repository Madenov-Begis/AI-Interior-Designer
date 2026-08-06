import type { ReactNode } from "react";
import { ProtectedRouteGuard } from "@/features/auth/index.client";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedRouteGuard>{children}</ProtectedRouteGuard>;
}
