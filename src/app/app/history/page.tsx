import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryGrid } from "@/components/history/history-grid";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  try { await requireCurrentUser(); } catch (error) { if (error instanceof UnauthorizedError) redirect("/login"); throw error; }
  return <main className="min-h-screen bg-background p-3 text-foreground sm:p-5"><div className="mx-auto max-w-[1500px] rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><Link href="/app" className="text-sm text-muted">← В редактор</Link><h1 className="mt-2 text-3xl font-black italic sm:text-4xl">История генераций</h1></div><Link href="/app" className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">＋ Новый дизайн</Link></header><div className="mt-6"><HistoryGrid /></div></div></main>;
}
