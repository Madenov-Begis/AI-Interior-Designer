export const SIGNUP_CREDIT_GRANT = 10;
export const GENERATION_CREDIT_COST = 4;
export const VERTEX_GENERATION_COST_USD = 0.1472;
export const GENERATION_BUDGET_UZS = 2_100;

export const GENERATION_REFUND_MESSAGE =
  "При технической ошибке кредиты не списываются и автоматически возвращаются на баланс.";

export const CREDIT_PACKAGES = [
  { code: "mini", name: "Мини", credits: 20, priceUzs: 25_000, popular: false },
  {
    code: "standard",
    name: "Стандарт",
    credits: 60,
    priceUzs: 69_000,
    popular: true,
  },
  { code: "pro", name: "Про", credits: 160, priceUzs: 169_000, popular: false },
] as const;

export type CreditPackageCode = (typeof CREDIT_PACKAGES)[number]["code"];

export function getCreditPackage(code: string) {
  return CREDIT_PACKAGES.find((item) => item.code === code) ?? null;
}

export const APP_NAV_ITEMS = [
  { href: "/app", label: "Создать", icon: "image-plus" },
  { href: "/app/profile", label: "Профиль", icon: "user" },
  { href: "/app/credits", label: "Кредиты", icon: "credit-card" },
] as const;
