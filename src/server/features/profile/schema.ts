import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  timezone: z.literal("Asia/Tashkent").default("Asia/Tashkent"),
});
