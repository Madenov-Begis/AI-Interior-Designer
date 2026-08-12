import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { adjustCreditBalance } from "@/server/features/credits/service";
import { cancelGenerationAsAdmin } from "@/server/features/generations/service";
import { getDb } from "@/server/shared/db/prisma";
import { serverEnv } from "@/server/shared/config/env";
import { getSupabaseAdmin } from "@/server/shared/integrations/supabase/admin";
import { AdminServiceError } from "./http";
import { adminPeriodRange, zonedDateKey } from "./time";
import { adminAccessViolation, removesActiveAdminAccess } from "./user-access-policy";

const generationStatuses = [
  "QUEUED",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
] as const;

function iso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function account(value: {
  displayName: string | null;
  email: string | null;
  phone: string | null;
}) {
  return value.displayName || value.email || value.phone || "Без имени";
}

function pageInfo(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

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
  _count: { select: { projects: true, generations: true, paymentOrders: true } },
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

export async function getAdminStats(period: "today" | "7d" | "30d") {
  const db = getDb();
  const range = adminPeriodRange(period, serverEnv().APP_TIMEZONE);
  const periodWhere = { createdAt: { gte: range.from, lte: range.to }, deletedAt: null };
  const [
    users,
    projects,
    generations,
    activeUsers,
    periodGenerations,
    statusRows,
    queued,
    processing,
  ] = await Promise.all([
    db.profile.count(),
    db.project.count({ where: { deletedAt: null } }),
    db.generation.count({ where: { deletedAt: null } }),
    db.profile.count({ where: { status: "ACTIVE", lastLoginAt: { gte: range.from } } }),
    db.generation.findMany({ where: periodWhere, select: { createdAt: true, status: true } }),
    db.generation.groupBy({
      by: ["status"],
      where: periodWhere,
      _count: { _all: true },
    }),
    db.generation.count({ where: { status: "QUEUED", deletedAt: null } }),
    db.generation.count({ where: { status: "PROCESSING", deletedAt: null } }),
  ]);
  const statusBreakdown = Object.fromEntries(
    generationStatuses.map((status) => [status, 0]),
  ) as Record<(typeof generationStatuses)[number], number>;
  for (const row of statusRows) statusBreakdown[row.status] = row._count._all;
  const daily = new Map(range.dateKeys.map((date) => [date, 0]));
  for (const item of periodGenerations) {
    const key = zonedDateKey(item.createdAt, range.timeZone);
    if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + 1);
  }
  return {
    period: {
      key: range.period,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      timeZone: range.timeZone,
    },
    totals: { users, projects, generations },
    activity: {
      activeUsers,
      generations: periodGenerations.length,
      failed: statusBreakdown.FAILED,
    },
    queue: { queued, processing },
    statusBreakdown,
    dailySeries: Array.from(daily, ([date, count]) => ({ date, count })),
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
  const [totalItems, rows] = await getDb().$transaction([
    getDb().profile.count({ where }),
    getDb().profile.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: userListInclude,
    }),
  ]);
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
  if (!user) throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
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
  await getDb().$transaction(async (tx) => {
    const current = await tx.profile.findUnique({ where: { id } });
    if (!current) throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
    const removesAdminAccess = removesActiveAdminAccess({
      currentRole: current.role,
      currentStatus: current.status,
      nextRole: input.role,
      nextStatus: input.status,
    });
    if (adminAccessViolation({ actorId, targetId: id, removesAccess: removesAdminAccess, otherActiveAdmins: 1 }) === "SELF_LOCKOUT")
      throw new AdminServiceError(
        "SELF_LOCKOUT",
        "Нельзя лишить себя административного доступа",
        409,
      );
    if (removesAdminAccess) {
      const otherAdmins = await tx.profile.count({
        where: { id: { not: id }, role: "ADMIN", status: "ACTIVE", deletedAt: null },
      });
      if (adminAccessViolation({ actorId, targetId: id, removesAccess: true, otherActiveAdmins: otherAdmins }) === "LAST_ADMIN")
        throw new AdminServiceError(
          "LAST_ADMIN",
          "Нельзя заблокировать или понизить последнего активного администратора",
          409,
        );
    }
    const updated = await tx.profile.update({
      where: { id },
      data: {
        role: input.role,
        status: input.status,
        deletedAt:
          input.status === "DELETED" ? new Date() : input.status ? null : undefined,
      },
      include: userListInclude,
    });
    return userListDto(updated);
  });
  return getAdminUser(id);
}

export async function adjustAdminUserCredits(
  actorId: string,
  userId: string,
  input: { amount: number; reason: string; idempotencyKey: string },
) {
  const exists = await getDb().profile.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
  const balance = await getDb().$transaction((tx) =>
    adjustCreditBalance(tx, { userId, actorId, ...input }),
  );
  return { userId, balance };
}

const generationInclude = {
  user: { select: { id: true, displayName: true, email: true, phone: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.GenerationInclude;

function generationListDto(generation: {
  id: string;
  userId: string;
  projectId: string;
  parentGenerationId: string | null;
  status: (typeof generationStatuses)[number];
  styleCode: string | null;
  aspectRatio: string;
  visualPromptUsed: boolean;
  attemptCount: number;
  durationMs: number | null;
  estimatedCost: { toString(): string } | null;
  errorCode: string | null;
  errorMessage: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; displayName: string | null; email: string | null; phone: string | null };
  project: { id: string; name: string };
}) {
  return {
    id: generation.id,
    user: { id: generation.user.id, account: account(generation.user) },
    project: generation.project,
    parentGenerationId: generation.parentGenerationId,
    status: generation.status,
    styleCode: generation.styleCode,
    aspectRatio: generation.aspectRatio,
    visualPromptUsed: generation.visualPromptUsed,
    attemptCount: generation.attemptCount,
    durationMs: generation.durationMs,
    estimatedCost: generation.estimatedCost?.toString() ?? null,
    error: generation.errorCode || generation.errorMessage
      ? { code: generation.errorCode, message: generation.errorMessage }
      : null,
    queuedAt: generation.queuedAt.toISOString(),
    startedAt: iso(generation.startedAt),
    completedAt: iso(generation.completedAt),
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
    canCancel: generation.status === "QUEUED" || generation.status === "PROCESSING",
  };
}

export async function listAdminGenerations(input: {
  page: number;
  pageSize: number;
  query?: string;
  status?: (typeof generationStatuses)[number];
  userId?: string;
  projectId?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.GenerationWhereInput = {
    deletedAt: null,
    status: input.status,
    userId: input.userId,
    projectId: input.projectId,
    createdAt: input.from || input.to
      ? { gte: input.from ? new Date(input.from) : undefined, lte: input.to ? new Date(input.to) : undefined }
      : undefined,
    ...(input.query
      ? {
          OR: [
            { id: /^[0-9a-f-]{36}$/i.test(input.query) ? input.query : undefined },
            { prompt: { contains: input.query, mode: "insensitive" } },
            { project: { name: { contains: input.query, mode: "insensitive" } } },
            { user: { displayName: { contains: input.query, mode: "insensitive" } } },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
            { user: { phone: { contains: input.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [totalItems, rows] = await getDb().$transaction([
    getDb().generation.count({ where }),
    getDb().generation.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: generationInclude,
    }),
  ]);
  return {
    items: rows.map(generationListDto),
    pageInfo: pageInfo(input.page, input.pageSize, totalItems),
  };
}

function mediaDto(file: {
  id: string;
  type: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
} | null) {
  return file
    ? {
        id: file.id,
        type: file.type,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        width: file.width,
        height: file.height,
      }
    : null;
}

const mediaSelect = {
  id: true,
  type: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
} satisfies Prisma.MediaFileSelect;

export async function getAdminGeneration(id: string) {
  const generation = await getDb().generation.findUnique({
    where: { id },
    include: {
      ...generationInclude,
      sourceImage: { select: mediaSelect },
      visualPromptImage: { select: mediaSelect },
      resultOriginal: { select: mediaSelect },
      resultUser: { select: mediaSelect },
      references: {
        orderBy: { position: "asc" },
        select: { position: true, file: { select: mediaSelect } },
      },
      usageEvent: {
        select: {
          id: true,
          status: true,
          creditAmount: true,
          reservedAt: true,
          consumedAt: true,
          refundedAt: true,
          expiresAt: true,
          reason: true,
        },
      },
    },
  });
  if (!generation) throw new AdminServiceError("NOT_FOUND", "Генерация не найдена", 404);
  const base = generationListDto(generation);
  return {
    ...base,
    prompt: generation.prompt,
    finalPrompt: generation.finalPrompt,
    providerRequestId: generation.providerRequestId,
    timeline: [
      { status: "QUEUED", at: generation.queuedAt.toISOString() },
      ...(generation.startedAt ? [{ status: "PROCESSING", at: generation.startedAt.toISOString() }] : []),
      ...(generation.completedAt ? [{ status: generation.status, at: generation.completedAt.toISOString() }] : []),
    ],
    usage: generation.usageEvent
      ? {
          ...generation.usageEvent,
          reservedAt: generation.usageEvent.reservedAt.toISOString(),
          consumedAt: iso(generation.usageEvent.consumedAt),
          refundedAt: iso(generation.usageEvent.refundedAt),
          expiresAt: iso(generation.usageEvent.expiresAt),
        }
      : null,
    media: {
      source: mediaDto(generation.sourceImage),
      visualPrompt: mediaDto(generation.visualPromptImage),
      resultOriginal: mediaDto(generation.resultOriginal),
      resultUser: mediaDto(generation.resultUser),
      references: generation.references.map((reference) => ({
        position: reference.position,
        ...mediaDto(reference.file)!,
      })),
    },
  };
}

export async function cancelAdminGeneration(id: string) {
  const exists = await getDb().generation.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) throw new AdminServiceError("NOT_FOUND", "Генерация не найдена", 404);
  if (!(await cancelGenerationAsAdmin(id)))
    throw new AdminServiceError(
      "GENERATION_NOT_CANCELLABLE",
      "Генерацию уже нельзя отменить",
      409,
    );
  return { id, status: "CANCELLED" as const, canCancel: false };
}

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
    createdAt: input.from || input.to
      ? { gte: input.from ? new Date(input.from) : undefined, lte: input.to ? new Date(input.to) : undefined }
      : undefined,
    ...(input.query
      ? {
          OR: [
            { id: /^[0-9a-f-]{36}$/i.test(input.query) ? input.query : undefined },
            { packageCode: { contains: input.query, mode: "insensitive" } },
            { packageName: { contains: input.query, mode: "insensitive" } },
            { providerOrderId: { contains: input.query, mode: "insensitive" } },
            { user: { displayName: { contains: input.query, mode: "insensitive" } } },
            { user: { email: { contains: input.query, mode: "insensitive" } } },
            { user: { phone: { contains: input.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [totalItems, rows] = await getDb().$transaction([
    getDb().paymentOrder.count({ where }),
    getDb().paymentOrder.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { user: { select: { id: true, displayName: true, email: true, phone: true } } },
    }),
  ]);
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
  kind?: "SIGNUP_GRANT" | "PURCHASE" | "GENERATION_DEBIT" | "TECHNICAL_REFUND" | "CANCELLATION_REFUND" | "ADMIN_ADJUSTMENT";
  userId?: string;
  from?: string;
  to?: string;
}) {
  const where: Prisma.CreditTransactionWhereInput = {
    userId: input.userId,
    kind: input.kind,
    createdAt: input.from || input.to
      ? { gte: input.from ? new Date(input.from) : undefined, lte: input.to ? new Date(input.to) : undefined }
      : undefined,
    ...(input.query
      ? {
          OR: [
            { reason: { contains: input.query, mode: "insensitive" } },
            { wallet: { user: { displayName: { contains: input.query, mode: "insensitive" } } } },
            { wallet: { user: { email: { contains: input.query, mode: "insensitive" } } } },
            { wallet: { user: { phone: { contains: input.query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const [totalItems, rows] = await getDb().$transaction([
    getDb().creditTransaction.count({ where }),
    getDb().creditTransaction.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { wallet: { include: { user: { select: { id: true, displayName: true, email: true, phone: true } } } } },
    }),
  ]);
  return {
    items: rows.map((transaction) => ({
      id: transaction.id,
      user: { id: transaction.wallet.user.id, account: account(transaction.wallet.user) },
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

export async function getAdminMediaSignedUrl(id: string) {
  const file = await getDb().mediaFile.findFirst({ where: { id, deletedAt: null } });
  if (!file) throw new AdminServiceError("NOT_FOUND", "Файл не найден", 404);
  const expiresIn = 300;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(file.bucket)
    .createSignedUrl(file.path, expiresIn);
  if (error || !data.signedUrl)
    throw new AdminServiceError("SIGNED_URL_FAILED", "Не удалось открыть файл", 502);
  return { url: data.signedUrl, expiresIn };
}
