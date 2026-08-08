import { RoovaAppHeader, type RoovaUserSummary } from "@/widgets/app-header";

export type AppUserSummary = RoovaUserSummary;

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
    <RoovaAppHeader
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
