import { RuvieAppHeader, type RuvieUserSummary } from "@/widgets/app-header";

export type AppUserSummary = RuvieUserSummary;

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
    <RuvieAppHeader
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
