import { MockCheckout } from "@/components/credits/mock-checkout";

export const dynamic = "force-dynamic";

export default async function CreditCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mx-auto mb-7 max-w-xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Тестовый заказ
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Оплата кредитов
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Проверьте пакет и выберите результат тестовой оплаты.
        </p>
      </header>
      <MockCheckout orderId={id} />
    </div>
  );
}
