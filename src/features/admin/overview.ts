import "server-only";

import { getDb } from "@/lib/db";

export async function getAdminOverview() {
  const db = getDb();
  const [
    usersCount,
    projectsCount,
    generationsCount,
    failedCount,
    users,
    generations,
    plans,
  ] = await Promise.all([
    db.profile.count({ where: { deletedAt: null } }),
    db.project.count({ where: { deletedAt: null } }),
    db.generation.count({ where: { deletedAt: null } }),
    db.generation.count({ where: { status: "FAILED", deletedAt: null } }),
    db.profile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { plan: true },
    }),
    db.generation.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, phone: true } } },
    }),
    db.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  return {
    counts: {
      users: usersCount,
      projects: projectsCount,
      generations: generationsCount,
      failed: failedCount,
    },
    users: users.map((user) => ({
      id: user.id,
      account: user.displayName || user.email || user.phone || "—",
      role: user.role,
      plan: user.plan?.name ?? "—",
      status: user.status,
    })),
    generations: generations.map((generation) => ({
      id: generation.id,
      account: generation.user.email ?? generation.user.phone ?? "—",
      status: generation.status,
      createdAt: generation.createdAt.toISOString(),
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      users: plan._count.users,
    })),
  };
}
