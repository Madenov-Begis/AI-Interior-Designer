import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { AccountMenu, type RuvieUserSummary } from "./account-menu";
import { RuvieLogo } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { AppLanguageSwitcher, useAppText } from "@/shared/providers";

export function RuvieAppHeader({
  user,
  creditBalance,
  middle,
}: {
  user: RuvieUserSummary;
  creditBalance?: number | null;
  middle?: React.ReactNode;
}) {
  const t = useAppText();
  return (
    <header className="relative z-50 flex h-[72px] shrink-0 items-center gap-4 border-b border-border bg-[#1b1b1d] px-4 sm:px-6 lg:px-10">
      <RuvieLogo href="/" className="lg:min-w-48" />
      {middle ? (
        <div className="min-w-0 flex-1">{middle}</div>
      ) : (
        <div className="flex-1" />
      )}
      <nav
        className="hidden items-center gap-1 md:flex"
        aria-label={t("Основная навигация")}
      >
        <Button asChild variant="ghost" size="lg">
          <Link href="/app/projects" prefetch={false}>
            <FolderOpen data-icon="inline-start" />
            {t("Все проекты")}
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/app" prefetch={false}>
            <Plus data-icon="inline-start" />
            {t("Создать новый проект")}
          </Link>
        </Button>
      </nav>
      <AppLanguageSwitcher className="hidden sm:flex" />
      <AccountMenu user={user} creditBalance={creditBalance} />
    </header>
  );
}
