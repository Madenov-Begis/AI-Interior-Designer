import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { adjustCreditBalance } from "@/server/features/credits/service";
import { getDb } from "@/server/shared/db/prisma";
import { AdminServiceError } from "./http";
import { updateAdminAccess } from "./user-access-operations";
import { iso, account, pageInfo } from "./presentation";

function userListDto(user: {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  creditWallet: { balance: number } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { projects: number; generations: number; paymentOrders: number };
}) {
  return {
    id: user.id,
    account: account(user),
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    balance: user.creditWallet?.balance ?? 0,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    counts: user._count,
  };
}

const userListInclude = {
  creditWallet: { select: { balance: true } },
  _count: {
    select: { projects: true, generations: true, paymentOrders: true },
  },
} satisfies Prisma.ProfileInclude;

export function getAdminSession(profile: {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
}) {
  return {
    admin: {
      id: profile.id,
      account: account(profile),
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      status: profile.status,
    },
  };
}

export async function listAdminUsers(input: {
  page: number;
  pageSize: number;
  query?: string;
  role?: "USER" | "ADMIN";
  status?: "ACTIVE" | "BLOCKED" | "DELETED";
}) {
  const where: Prisma.ProfileWhereInput = {
    role: input.role,
    status: input.status,
    ...(input.query
      ? {
          OR: [
            { displayName: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
            { phone: { contains: input.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const db = getDb();
  const totalItems = await db.profile.count({ where });
  const rows = await db.profile.findMany({
    where,
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: userListInclude,
  });
  return {
    items: rows.map(userListDto),
    pageInfo: pageInfo(input.page, input.pageSize, totalItems),
  };
}

export async function getAdminUser(id: string) {
  const user = await getDb().profile.findUnique({
    where: { id },
    include: userListInclude,
  });
  if (!user)
    throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
  return {
    ...userListDto(user),
    firstName: user.firstName,
    lastName: user.lastName,
    timezone: user.timezone,
    deletedAt: iso(user.deletedAt),
  };
}

export async function updateAdminUser(
  actorId: string,
  id: string,
  input: {
    role?: "USER" | "ADMIN";
    status?: "ACTIVE" | "BLOCKED" | "DELETED";
  },
) {
  await updateAdminAccess(getDb(), actorId, id, input);
  return getAdminUser(id);
}

export async function adjustAdminUserCredits(
  actorId: string,
  userId: string,
  input: { amount: number; reason: string; idempotencyKey: string },
) {
  const exists = await getDb().profile.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!exists)
    throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
  const balance = await getDb().$transaction((tx) =>
    adjustCreditBalance(tx, { userId, actorId, ...input }),
  );
  return { userId, balance };
}
