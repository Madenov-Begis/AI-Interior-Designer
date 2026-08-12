import { z } from "zod";

const uuid = z.uuid();
const optionalDateTime = z.iso.datetime({ offset: true }).optional();

export const adminIdSchema = uuid;

export const adminPeriodSchema = z.enum(["today", "7d", "30d"]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

function withDateRange<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({ ...shape, from: optionalDateTime, to: optionalDateTime })
    .refine((value) => {
      const range = value as { from?: string; to?: string };
      return !range.from || !range.to || range.from <= range.to;
    }, { path: ["to"], message: "Дата окончания должна быть позже даты начала" });
}

export const usersListSchema = paginationSchema.extend({
  query: z.string().trim().max(120).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(),
});

export const generationsListSchema = withDateRange({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z.string().trim().max(120).optional(),
  status: z
    .enum(["QUEUED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED", "REJECTED"])
    .optional(),
  userId: uuid.optional(),
  projectId: uuid.optional(),
});

export const paymentOrdersListSchema = withDateRange({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z.string().trim().max(120).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED"]).optional(),
  provider: z.enum(["MOCK", "PAYME", "CLICK"]).optional(),
});

export const creditTransactionsListSchema = withDateRange({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z.string().trim().max(120).optional(),
  kind: z
    .enum([
      "SIGNUP_GRANT",
      "PURCHASE",
      "GENERATION_DEBIT",
      "TECHNICAL_REFUND",
      "CANCELLATION_REFUND",
      "ADMIN_ADJUSTMENT",
    ])
    .optional(),
  userId: uuid.optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нет изменений");

export const creditAdjustmentSchema = z
  .object({
    amount: z
      .number()
      .int()
      .min(-100_000)
      .max(100_000)
      .refine((value) => value !== 0, "Сумма корректировки не может быть нулевой"),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: uuid,
  })
  .strict();
