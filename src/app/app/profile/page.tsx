import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export default async function ProfilePage() { try { await requireCurrentUser(); } catch (error) { if (error instanceof UnauthorizedError) redirect("/login"); throw error; } return <main className="min-h-screen bg-background p-3 text-foreground sm:p-5"><div className="mx-auto max-w-[1200px] rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:p-7"><header className="border-b border-border pb-5"><Link href="/app" className="text-sm text-muted">← Рабочая область</Link><h1 className="mt-2 text-3xl font-black italic sm:text-4xl">Профиль</h1></header><div className="mt-6"><ProfilePanel /></div></div></main>; }
