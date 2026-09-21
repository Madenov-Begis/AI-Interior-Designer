"use client";

import { useParams } from "next/navigation";
import { MockCheckout } from "@/features/manage-credits";
import { useAppText } from "@/shared/providers";

export default function CreditCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const t = useAppText();

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="mx-auto mb-7 max-w-xl">
        <p className="font-mono text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {t("Тестовый заказ")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {t("Оплата кредитов")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("Проверьте пакет и выберите результат тестовой оплаты.")}
        </p>
      </header>
      {id ? <MockCheckout orderId={id} /> : null}
    </div>
  );
}
