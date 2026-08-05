import type { ReactNode } from "react";
import { ProtectedRouteGuard } from "@/client/features/auth/ui/protected-route-guard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ProtectedRouteGuard>{children}</ProtectedRouteGuard>;
}
