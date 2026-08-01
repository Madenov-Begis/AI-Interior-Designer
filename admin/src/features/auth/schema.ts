import { z } from "zod";

export const adminLoginSchema = z.object({
  phone: z
    .string()
    .regex(/^\+998\d{9}$/, "Введите номер в формате +998XXXXXXXXX"),
});
