import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import {
  AccountMenu,
  type RenoaUserSummary,
} from "@/client/widgets/app-header/account-menu";
import { RenoaLogo } from "@/client/shared/components/design-system/brand";
import { Button } from "@/client/shared/components/ui/button";

export function RenoaAppHeader({
  user,
  creditBalance,
  middle,
}: {
  user: RenoaUserSummary;
  creditBalance?: number | null;
  middle?: React.ReactNode;
}) {
  return (
    <header className="relative z-50 flex h-[72px] shrink-0 items-center gap-4 border-b border-border bg-[#1b1b1d] px-4 sm:px-6 lg:px-10">
      <RenoaLogo href="/" className="lg:min-w-48" />
      {middle ? (
        <div className="min-w-0 flex-1">{middle}</div>
      ) : (
        <div className="flex-1" />
      )}
      <nav
        className="hidden items-center gap-1 md:flex"
        aria-label="Основная навигация"
      >
        <Button asChild variant="ghost" size="lg">
          <Link href="/app/projects" prefetch={false}>
            <FolderOpen data-icon="inline-start" />
            Все проекты
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/app" prefetch={false}>
            <Plus data-icon="inline-start" />
            Создать новый проект
          </Link>
        </Button>
      </nav>
      <AccountMenu user={user} creditBalance={creditBalance} />
    </header>
  );
}
