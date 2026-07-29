import { ProfilePanel } from "@/components/profile/profile-panel";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-7">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Аккаунт
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Профиль
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Личные данные, доступ и использование Renoa.
        </p>
      </header>
      <ProfilePanel />
    </div>
  );
}
