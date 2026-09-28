import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "../../../generated/prisma/client";
import { nextAdaptiveLimit } from "./worker-policy.ts";

export type DispatchConfig = { key: string; mode: "fixed" | "adaptive"; initial: number; maximum: number; startsPerSecond: number; tempBudgetBytes: number };
export async function lockRegulator(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

export async function claimExecution(db: PrismaClient, id: string, config: DispatchConfig, now = new Date()) {
  return db.$transaction(async (tx) => {
    await lockRegulator(tx, config.key);
    const job = await tx.generation.findUnique({ where: { id }, include: { execution: true, usageEvent: true } });
    if (!job || job.deletedAt || !["QUEUED", "PROCESSING"].includes(job.status) ||
      job.usageEvent?.status !== "RESERVED" || !job.usageEvent.expiresAt || job.usageEvent.expiresAt <= now) return null;
    const old = job.execution;
    if (old && (old.leaseUntil > now || old.nextAttemptAt > now || old.stage === "SENDING")) return null;
    if (!old && job.status === "PROCESSING") return null;
    const processing = old?.stage === "RAW_READY";
    if (!processing) {
      await tx.generationPermit.deleteMany({ where: { expiresAt: { lte: now } } });
      let regulator = await tx.generationRegulator.upsert({ where: { key: config.key }, create: { key: config.key, limit: config.initial }, update: {} });
      const limit = config.mode === "adaptive" ? nextAdaptiveLimit({ limit: regulator.limit, maximum: config.maximum, successes: regulator.successes, lastIncreaseAt: regulator.lastIncreaseAt.getTime(), cooldownUntil: regulator.cooldownUntil.getTime(), now: now.getTime(), backlog: true }) : config.maximum;
      if (limit !== regulator.limit) regulator = await tx.generationRegulator.update({ where: { key: config.key }, data: { limit, lastIncreaseAt: now, successes: 0 } });
      const active = await tx.generationPermit.count({ where: { regulatorKey: config.key, expiresAt: { gt: now } } });
      const pending = await tx.generationExecution.aggregate({ _sum: { rawBytes: true } });
      // Резерв под каждый ещё не полученный ответ ограничивает всплеск записи на диск.
      if (active >= limit || (pending._sum.rawBytes || 0) + (active + 1) * 64 * 1024 ** 2 > config.tempBudgetBytes) return null;
      if (await tx.generationPermit.findUnique({ where: { generationId: id } })) return null;
    }
    const owner = randomUUID();
    const claimed = await tx.generation.updateMany({ where: { id, status: job.status, jobId: job.jobId }, data: {
      status: "PROCESSING", jobId: owner, startedAt: job.startedAt || now,
    } });
    if (!claimed.count) return null;
    const execution = await tx.generationExecution.upsert({ where: { generationId: id }, create: {
      generationId: id, owner, leaseUntil: new Date(now.getTime() + 60_000), regulatorKey: config.key,
    }, update: { owner, leaseUntil: new Date(now.getTime() + 60_000), stage: processing ? "RAW_READY" : "PREPARING" } });
    if (!processing) await tx.generationPermit.create({ data: { generationId: id, owner, regulatorKey: config.key, expiresAt: new Date(now.getTime() + 60_000) } });
    return execution;
  });
}

export async function beginProvider(db: PrismaClient, id: string, owner: string, config: DispatchConfig) {
  return db.$transaction(async (tx) => {
    await lockRegulator(tx, config.key);
    const now = new Date();
    const regulator = await tx.generationRegulator.findUniqueOrThrow({ where: { key: config.key } });
    if (regulator.nextDispatchAt > now) return false;
    const updated = await tx.generationExecution.updateMany({ where: { generationId: id, owner, stage: "PREPARING", leaseUntil: { gt: now }, generation: { status: "PROCESSING", jobId: owner, usageEvent: { status: "RESERVED", expiresAt: { gt: now } } } }, data: { stage: "SENDING", providerAttempts: { increment: 1 } } });
    if (!updated.count) throw new Error("EXECUTION_LEASE_LOST");
    await tx.generation.update({ where: { id }, data: { attemptCount: { increment: 1 } } });
    await tx.generationPermit.update({ where: { generationId: id }, data: { expiresAt: new Date(now.getTime() + 210_000) } });
    await tx.generationRegulator.update({ where: { key: config.key }, data: { nextDispatchAt: new Date(now.getTime() + 1000 / config.startsPerSecond) } });
    return true;
  });
}

export async function releasePreparation(db: PrismaClient, id: string, owner: string) {
  await db.$transaction(async (tx) => {
    await tx.generationExecution.updateMany({ where: { generationId: id, owner, stage: "PREPARING" }, data: { leaseUntil: new Date(0), nextAttemptAt: new Date(Date.now() + 1000) } });
    await tx.generationPermit.deleteMany({ where: { generationId: id, owner } });
  });
}
