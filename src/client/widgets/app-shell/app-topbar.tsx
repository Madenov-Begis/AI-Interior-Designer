import { RenoaAppHeader } from "@/client/widgets/app-header/app-header";
import type { RenoaUserSummary } from "@/client/widgets/app-header/account-menu";

export type AppUserSummary = RenoaUserSummary;

export function AppTopbar({
  title,
  user,
  creditBalance,
}: {
  title?: string;
  user: AppUserSummary;
  creditBalance?: number | null;
}) {
  return (
    <RenoaAppHeader
      user={user}
      creditBalance={creditBalance}
      middle={
        title ? (
          <p className="truncate text-sm font-semibold text-muted-foreground">
            {title}
          </p>
        ) : undefined
      }
    />
  );
}
