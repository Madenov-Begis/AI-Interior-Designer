import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import {
  AccountMenu,
  type RenoaUserSummary,
} from "@/components/design-system/account-menu";
import { RenoaLogo } from "@/components/design-system/brand";

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
        <Link
          href="/app/projects"
          className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <FolderOpen className="size-[18px]" />
          Все проекты
        </Link>
        <Link
          href="/app"
          className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-[18px]" />
          Создать новый проект
        </Link>
      </nav>
      <AccountMenu user={user} creditBalance={creditBalance} />
    </header>
  );
}
