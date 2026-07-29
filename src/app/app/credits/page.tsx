import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { CreditsGrid } from "@/components/credits/credits-grid";
import { requireCurrentUser, UnauthorizedError } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }
  const name =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    user.email?.split("@")[0] ||
    "Пользователь";

  return (
    <AppShell
      title="Кредиты"
      user={{
        name,
        email: user.email ?? "",
        avatarUrl:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      }}
    >
      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-7">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Баланс Renoa
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Кредиты
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Один баланс для всех проектов и любых веток интерьера.
          </p>
        </header>
        <CreditsGrid />
      </div>
    </AppShell>
  );
}
