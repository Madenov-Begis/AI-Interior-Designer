import assert from "node:assert/strict";
import test from "node:test";
import { getLocalAdminPhone } from "./admin-phone.ts";
import { getAdminOrigins, isAdminOriginAllowed } from "./cors.ts";
import {
  adminPeriodSchema,
  creditAdjustmentSchema,
  creditTransactionsListSchema,
  createCreditPackageSchema,
  createRoomTypeSchema,
  generationsListSchema,
  paymentOrdersListSchema,
  updateUserSchema,
  updateCreditPackageSchema,
  updateRoomTypeSchema,
  usersListSchema,
} from "./schemas.ts";
import { adminPeriodRange, zonedDateKey } from "./time.ts";
import { adminAccessViolation, removesActiveAdminAccess } from "./user-access-policy.ts";
import { issueAdminToken, matchesAdminAccessCode, verifyAdminToken } from "./admin-token.ts";

test("AdminPhone is development-only and strictly formatted", () => {
  assert.deepEqual(getLocalAdminPhone("AdminPhone +998901234567", "development"), {
    phone: "+998901234567",
    disabled: false,
  });
  assert.deepEqual(getLocalAdminPhone("AdminPhone +998901234567", "production"), {
    phone: null,
    disabled: true,
  });
  assert.equal(getLocalAdminPhone("AdminPhone 998901234567", "development").phone, null);
});

test("admin access code issues a signed expiring token", () => {
  const previousCode = process.env.ADMIN_ACCESS_CODE;
  const previousSecret = process.env.ADMIN_TOKEN_SECRET;
  process.env.ADMIN_ACCESS_CODE = "abcde";
  process.env.ADMIN_TOKEN_SECRET = "test-secret-that-is-longer-than-32-characters";
  try {
    assert.equal(matchesAdminAccessCode("abcde"), true);
    assert.equal(matchesAdminAccessCode("wrong"), false);
    const issued = issueAdminToken("admin-id", 1_000_000);
    assert.equal(verifyAdminToken(issued.token, 1_000_001)?.subject, "admin-id");
    assert.equal(
      verifyAdminToken(`${issued.token.slice(0, -1)}x`, 1_000_001),
      null,
    );
    assert.equal(
      verifyAdminToken(issued.token, 1_000_000 + issued.expiresIn * 1_000),
      null,
    );
  } finally {
    if (previousCode === undefined) delete process.env.ADMIN_ACCESS_CODE;
    else process.env.ADMIN_ACCESS_CODE = previousCode;
    if (previousSecret === undefined) delete process.env.ADMIN_TOKEN_SECRET;
    else process.env.ADMIN_TOKEN_SECRET = previousSecret;
  }
});

test("admin CORS uses an exact production allowlist", () => {
  const origins = getAdminOrigins("production", "https://admin.example, https://ops.example");
  assert.equal(origins.has("https://admin.example"), true);
  assert.equal(origins.has("http://localhost:5173"), false);
  assert.equal(isAdminOriginAllowed("https://admin.example.evil", "production", "https://admin.example"), false);
  assert.equal(isAdminOriginAllowed("http://localhost:5173", "development", undefined), true);
});

test("list schemas enforce page bounds, enums, UUID and date range", () => {
  assert.deepEqual(usersListSchema.parse({}), { page: 1, pageSize: 25 });
  assert.equal(usersListSchema.safeParse({ page: 0 }).success, false);
  assert.equal(usersListSchema.safeParse({ pageSize: 101 }).success, false);
  assert.equal(generationsListSchema.safeParse({ status: "UNKNOWN" }).success, false);
  assert.equal(
    paymentOrdersListSchema.safeParse({
      from: "2026-08-12T10:00:00.000Z",
      to: "2026-08-11T10:00:00.000Z",
    }).success,
    false,
  );
  assert.equal(adminPeriodSchema.safeParse("year").success, false);
  assert.equal(creditTransactionsListSchema.safeParse({ kind: "UNKNOWN" }).success, false);
  assert.equal(generationsListSchema.safeParse({ from: "yesterday" }).success, false);
});

test("mutation schemas reject unknown fields", () => {
  assert.equal(updateUserSchema.safeParse({}).success, false);
  assert.equal(updateUserSchema.safeParse({ status: "ACTIVE", unexpected: true }).success, false);
  assert.equal(
    creditAdjustmentSchema.safeParse({ amount: 0, reason: "Тест", idempotencyKey: crypto.randomUUID() }).success,
    false,
  );
  const validPackage = {
    code: "standard",
    name: "Стандарт",
    description: "Оптимально для ремонта",
    credits: 60,
    priceUzs: 69_000,
    popular: true,
    active: true,
    sortOrder: 20,
  };
  assert.equal(createCreditPackageSchema.safeParse(validPackage).success, true);
  assert.equal(createCreditPackageSchema.safeParse({ ...validPackage, code: "Standard" }).success, false);
  assert.equal(createCreditPackageSchema.safeParse({ ...validPackage, active: false }).success, false);
  assert.equal(updateCreditPackageSchema.safeParse({}).success, false);
  assert.equal(updateCreditPackageSchema.safeParse({ code: "new-code" }).success, false);
  const validRoom = {
    code: "living-room",
    name: "Гостиная",
    promptModifier: "Назначение помещения: гостиная.",
    active: true,
    sortOrder: 10,
  };
  assert.equal(createRoomTypeSchema.safeParse(validRoom).success, true);
  assert.equal(createRoomTypeSchema.safeParse({ ...validRoom, code: "Living Room" }).success, false);
  assert.equal(createRoomTypeSchema.safeParse({ ...validRoom, promptModifier: "коротко" }).success, false);
  assert.equal(updateRoomTypeSchema.safeParse({}).success, false);
  assert.equal(updateRoomTypeSchema.safeParse({ code: "bedroom" }).success, false);
});

test("admin access policy prevents self-lockout and removal of the last admin", () => {
  const removesAccess = removesActiveAdminAccess({
    currentRole: "ADMIN",
    currentStatus: "ACTIVE",
    nextStatus: "BLOCKED",
  });
  assert.equal(removesAccess, true);
  assert.equal(
    adminAccessViolation({ actorId: "a", targetId: "a", removesAccess, otherActiveAdmins: 3 }),
    "SELF_LOCKOUT",
  );
  assert.equal(
    adminAccessViolation({ actorId: "a", targetId: "b", removesAccess, otherActiveAdmins: 0 }),
    "LAST_ADMIN",
  );
  assert.equal(
    adminAccessViolation({ actorId: "a", targetId: "b", removesAccess, otherActiveAdmins: 1 }),
    null,
  );
  assert.equal(
    removesActiveAdminAccess({ currentRole: "ADMIN", currentStatus: "BLOCKED", nextRole: "USER" }),
    false,
  );
});

test("stats period is timezone aware and zero-fill keys are complete", () => {
  const now = new Date("2026-08-11T20:30:00.000Z");
  assert.equal(zonedDateKey(now, "Asia/Tashkent"), "2026-08-12");
  const range = adminPeriodRange("7d", "Asia/Tashkent", now);
  assert.equal(range.dateKeys.length, 7);
  assert.equal(range.dateKeys[0], "2026-08-06");
  assert.equal(range.dateKeys[6], "2026-08-12");
  assert.equal(range.from.toISOString(), "2026-08-05T19:00:00.000Z");
});
