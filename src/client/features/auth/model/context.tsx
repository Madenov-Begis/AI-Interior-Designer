"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppSession } from "./current-user.ts";

const AppSessionContext = createContext<AppSession | null>(null);

export function AppSessionProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  return (
    <AppSessionContext.Provider value={session}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error("useAppSession must be used inside ProtectedRouteGuard");
  }
  return session;
}
