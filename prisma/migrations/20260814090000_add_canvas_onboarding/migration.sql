ALTER TABLE "Profile"
ADD COLUMN "canvasOnboardingVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "canvasOnboardingCompletedAt" TIMESTAMP(3);
