import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";
import { getCreditWallet } from "@/features/credits/service";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  const wallet = await getCreditWallet(user.id, 0);

  const name =
    (typeof user.user_metadata.full_name === "string" &&
      user.user_metadata.full_name) ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <AppShell
      user={{
        name,
        email: user.email ?? "",
        avatarUrl:
          typeof user.user_metadata.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      }}
      creditBalance={wallet.balance}
    >
      {children}
    </AppShell>
  );
}
