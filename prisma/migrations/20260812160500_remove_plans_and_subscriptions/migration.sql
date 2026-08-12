-- Product access is uniform for every user. Limits are now validated server
-- configuration, while credits remain account-specific.
DROP TABLE "Subscription";

ALTER TABLE "Profile" DROP CONSTRAINT "Profile_planId_fkey";
DROP INDEX "Profile_planId_idx";
ALTER TABLE "Profile"
  DROP COLUMN "planId",
  DROP COLUMN "maxParallelOverride",
  DROP COLUMN "vipExpiresAt";

DROP TABLE "Plan";
DROP TYPE "SubscriptionStatus";
