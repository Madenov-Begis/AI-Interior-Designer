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
    .refine(
      (value) => {
        const range = value as { from?: string; to?: string };
        return !range.from || !range.to || range.from <= range.to;
      },
      { path: ["to"], message: "Дата окончания должна быть позже даты начала" },
    );
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
    .enum([
      "QUEUED",
      "PROCESSING",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
  userId: uuid.optional(),
  projectId: uuid.optional(),
});

export const paymentOrdersListSchema = withDateRange({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  query: z.string().trim().max(120).optional(),
  status: z
    .enum(["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED"])
    .optional(),
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
      .refine(
        (value) => value !== 0,
        "Сумма корректировки не может быть нулевой",
      ),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: uuid,
  })
  .strict();

const creditPackageFields = {
  name: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  nameUz: z.string().trim().min(2).max(80).nullable(),
  description: z.string().trim().max(240).nullable(),
  descriptionEn: z.string().trim().max(240).nullable(),
  descriptionUz: z.string().trim().max(240).nullable(),
  credits: z.number().int().min(1).max(1_000_000),
  priceUzs: z.number().int().min(1_000).max(2_000_000_000),
  popular: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(-10_000).max(10_000),
};

export const createCreditPackageSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-z0-9-]+$/),
    ...creditPackageFields,
  })
  .strict()
  .refine((value) => value.active || !value.popular, {
    path: ["popular"],
    message: "Неактивный пакет не может быть популярным",
  });

export const updateCreditPackageSchema = z
  .object({
    name: creditPackageFields.name.optional(),
    nameEn: creditPackageFields.nameEn.optional(),
    nameUz: creditPackageFields.nameUz.optional(),
    description: creditPackageFields.description.optional(),
    descriptionEn: creditPackageFields.descriptionEn.optional(),
    descriptionUz: creditPackageFields.descriptionUz.optional(),
    credits: creditPackageFields.credits.optional(),
    priceUzs: creditPackageFields.priceUzs.optional(),
    popular: creditPackageFields.popular.optional(),
    active: creditPackageFields.active.optional(),
    sortOrder: creditPackageFields.sortOrder.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нет изменений")
  .refine((value) => value.active !== false || value.popular !== true, {
    path: ["popular"],
    message: "Неактивный пакет не может быть популярным",
  });

const roomTypeFields = {
  name: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  nameUz: z.string().trim().min(2).max(80).nullable(),
  promptModifier: z.string().trim().min(10).max(2000),
  active: z.boolean(),
  sortOrder: z.number().int().min(-10_000).max(10_000),
};

export const createRoomTypeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-z0-9-]+$/),
    ...roomTypeFields,
  })
  .strict();

export const updateRoomTypeSchema = z
  .object({
    name: roomTypeFields.name.optional(),
    nameEn: roomTypeFields.nameEn.optional(),
    nameUz: roomTypeFields.nameUz.optional(),
    promptModifier: roomTypeFields.promptModifier.optional(),
    active: roomTypeFields.active.optional(),
    sortOrder: roomTypeFields.sortOrder.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нет изменений");
