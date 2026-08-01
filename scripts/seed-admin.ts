import { config } from "dotenv";
config({ path: ".env.local" });
config({
  path: process.env.ADMIN_ENV_FILE ?? "admin/.env.local",
  override: true,
});

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const phone = process.env.ADMIN_PHONE_E164?.trim();
const password = process.env.ADMIN_PASSWORD;
if (!phone || !/^\+998\d{9}$/.test(phone))
  throw new Error("ADMIN_PHONE_E164 must use +998XXXXXXXXX format");
if (!password || password.length < 12)
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
const normalizedPhone = phone.replace(/\D/g, "");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl || !serviceRoleKey || !databaseUrl)
  throw new Error("Supabase and database configuration is required");

const auth = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
let page = 1;
let found: { id: string } | undefined;
while (!found) {
  const { data, error } = await auth.auth.admin.listUsers({
    page,
    perPage: 50,
  });
  if (error) throw error;
  found = data.users.find(
    (user) => user.phone?.replace(/\D/g, "") === normalizedPhone,
  );
  if (found || data.users.length < 50) break;
  page += 1;
}

const authResult = found
  ? await auth.auth.admin.updateUserById(found.id, {
      password,
      phone_confirm: true,
    })
  : await auth.auth.admin.createUser({ phone, password, phone_confirm: true });
if (authResult.error)
  throw new Error(`ADMIN_AUTH_USER_ERROR: ${authResult.error.message}`);
if (!authResult.data.user) throw new Error("ADMIN_AUTH_USER_NOT_CREATED");

const user = authResult.data.user;

await db.profile.upsert({
  where: { id: user.id },
  create: {
    id: user.id,
    email: null,
    phone,
    displayName: "Администратор",
    role: "ADMIN",
    status: "ACTIVE",
    lastLoginAt: new Date(),
  },
  update: { phone, role: "ADMIN", status: "ACTIVE", deletedAt: null },
});

console.log(`Admin profile prepared for ${phone}`);
await db.$disconnect();
