export const GENERATION_CREDIT_COST = 4;

export const GENERATION_REFUND_MESSAGE =
  "При технической ошибке кредиты не списываются и автоматически возвращаются на баланс.";

export const CREDIT_PACKAGES = [
  { code: "start", name: "Старт", credits: 50, price: 390, popular: false },
  { code: "creator", name: "Креатор", credits: 140, price: 990, popular: false },
  { code: "studio", name: "Студия", credits: 400, price: 2490, popular: true },
  { code: "business", name: "Бизнес", credits: 1200, price: 6490, popular: false },
  { code: "corporate", name: "Корпоративный", credits: 5000, price: 19990, popular: false },
] as const;

export const APP_NAV_ITEMS = [
  { href: "/app", label: "Создать", icon: "sparkles" },
  { href: "/app/history", label: "История", icon: "history" },
  { href: "/app/profile", label: "Профиль", icon: "user" },
  { href: "/app/credits", label: "Кредиты", icon: "credit-card" },
] as const;
