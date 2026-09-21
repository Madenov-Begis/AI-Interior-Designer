import type { PaymentOrder } from "@/generated/prisma/client.ts";
import type { Locale } from "@/i18n/routing";
import { localizedName } from "../../shared/i18n/catalog.ts";

export function paymentOrderSummary(
  order: PaymentOrder,
  locale: Locale = "en",
) {
  return {
    id: order.id,
    status: order.status,
    packageCode: order.packageCode,
    packageName: localizedName(
      {
        name: order.packageName,
        nameEn: order.packageNameEn,
        nameUz: order.packageNameUz,
      },
      locale,
    ),
    credits: order.credits,
    amountUzs: order.amountUzs,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export type PaymentOrderSummary = ReturnType<typeof paymentOrderSummary>;
