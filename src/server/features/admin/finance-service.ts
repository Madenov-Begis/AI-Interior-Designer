import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/shared/db/prisma";
import {
  createCreditPackageWithDatabase,
  updateCreditPackageWithDatabase,
  type CreditPackageMutation,
} from "./credit-package-operations";
import { iso, account, pageInfo } from "./presentation";

export async function listAdminPaymentOrders(input: {
  page: number;
  pageSize: number;
  query?: string;
  status?: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  provider?: "MOCK" | "PAYME" | "CLICK";
  from?: string;
  to?: string;
}) {
  const where: Prisma.PaymentOrderWhereInput = {
    status: input.status,
    provider: input.provider,
    createdAt:
      input.from || input.to
        ? {
            gte: input.from ? new Date(input.from) : undefined,
            lte: input.to ? new Date(input.to) : undefined,
          }
        : undefined,
    ...(input.query
      ? {
          OR: [
            {
              id: /^[0-9a-f-]{36}$/i.test(input.query)
                ? input.query
                : undefined,
            },
            { packageCode: { contains: input.query, mode: "insensitive" } },
            { packageName: { contains: input.query, mode: "insensitive" } },
            { providerOrderId: { contains: input.query, mode: "insensitive" } },
            {
              user: {
                displayName: { contains: input.query, mode: "insensitive" },
              },
            },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
            { user: { phone: { contains: input.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const db = getDb();
  const totalItems = await db.paymentOrder.count({ where });
  const rows = await db.paymentOrder.findMany({
    where,
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      user: {
        select: { id: true, displayName: true, email: true, phone: true },
      },
    },
  });
  return {
    items: rows.map((order) => ({
      id: order.id,
      user: { id: order.user.id, account: account(order.user) },
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      status: order.status,
      packageCode: order.packageCode,
      packageName: order.packageName,
      credits: order.credits,
      amountUzs: order.amountUzs,
      expiresAt: order.expiresAt.toISOString(),
      paidAt: iso(order.paidAt),
      creditedAt: iso(order.creditedAt),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
    pageInfo: pageInfo(input.page, input.pageSize, totalItems),
  };
}

export async function listAdminCreditTransactions(input: {
  page: number;
  pageSize: number;
  query?: string;
  kind?:
    | "SIGNUP_GRANT"
    | "PURCHASE"
    | "GENERATION_DEBIT"
    | "TECHNICAL_REFUND"
    | "CANCELLATION_REFUND"
    | "ADMIN_ADJUSTMENT";
  userId?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.CreditTransactionWhereInput = {
    userId: input.userId,
    kind: input.kind,
    createdAt:
      input.from || input.to
        ? {
            gte: input.from ? new Date(input.from) : undefined,
            lte: input.to ? new Date(input.to) : undefined,
          }
        : undefined,
    ...(input.query
      ? {
          OR: [
            { reason: { contains: input.query, mode: "insensitive" } },
            {
              wallet: {
                user: {
                  displayName: { contains: input.query, mode: "insensitive" },
                },
              },
            },
            {
              wallet: {
                user: { email: { contains: input.query, mode: "insensitive" } },
              },
            },
            {
              wallet: {
                user: { phone: { contains: input.query, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };
  const db = getDb();
  const totalItems = await db.creditTransaction.count({ where });
  const rows = await db.creditTransaction.findMany({
    where,
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      wallet: {
        include: {
          user: {
            select: { id: true, displayName: true, email: true, phone: true },
          },
        },
      },
    },
  });
  return {
    items: rows.map((transaction) => ({
      id: transaction.id,
      user: {
        id: transaction.wallet.user.id,
        account: account(transaction.wallet.user),
      },
      kind: transaction.kind,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      reason: transaction.reason,
      orderId: transaction.orderId,
      generationId: transaction.generationId,
      createdAt: transaction.createdAt.toISOString(),
    })),
    pageInfo: pageInfo(input.page, input.pageSize, totalItems),
  };
}

function creditPackageDto(item: {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  nameUz: string | null;
  description: string | null;
  descriptionEn: string | null;
  descriptionUz: string | null;
  credits: number;
  priceUzs: number;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function listAdminCreditPackages() {
  const items = await getDb().creditPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { credits: "asc" }, { code: "asc" }],
  });
  return { items: items.map(creditPackageDto) };
}

export async function createAdminCreditPackage(
  input: CreditPackageMutation & { code: string },
) {
  return creditPackageDto(
    await createCreditPackageWithDatabase(getDb(), input),
  );
}
export async function updateAdminCreditPackage(
  id: string,
  input: Partial<CreditPackageMutation>,
) {
  return creditPackageDto(
    await updateCreditPackageWithDatabase(getDb(), id, input),
  );
}

export async function deleteAdminCreditPackage(id: string) {
  const item = await getDb().creditPackage.delete({ where: { id } });
  return { id: item.id };
}
