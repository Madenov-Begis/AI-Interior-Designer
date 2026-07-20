-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('SOURCE_IMAGE', 'SOURCE_PREVIEW', 'VISUAL_PROMPT', 'REFERENCE', 'GENERATION_ORIGINAL', 'GENERATION_RESULT', 'WATERMARK');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('VERTEX_AI');

-- CreateEnum
CREATE TYPE "AspectRatio" AS ENUM ('1:1', '16:9', '9:16', '4:3', '3:4');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('RESERVED', 'CONSUMED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "planId" UUID,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "dailyLimitOverride" INTEGER,
    "maxParallelOverride" INTEGER,
    "vipExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dailyGenerationLimit" INTEGER,
    "maxParallelGenerations" INTEGER NOT NULL DEFAULT 1,
    "maxReferenceImages" INTEGER NOT NULL DEFAULT 10,
    "maxReferenceUrls" INTEGER NOT NULL DEFAULT 10,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 15,
    "maxOutputWidth" INTEGER,
    "maxOutputHeight" INTEGER,
    "watermarkRequired" BOOLEAN NOT NULL DEFAULT true,
    "priorityProcessing" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "prompt" TEXT,
    "modelId" UUID,
    "aspectRatio" "AspectRatio" NOT NULL DEFAULT '16:9',
    "sourceImageId" UUID,
    "sourcePreviewId" UUID,
    "visualPromptId" UUID,
    "canvasState" JSONB,
    "visualPromptUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "type" "MediaType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReference" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sourceUrl" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" UUID NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "code" TEXT NOT NULL,
    "externalModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "preview" BOOLEAN NOT NULL DEFAULT false,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 120,
    "maxReferenceImages" INTEGER NOT NULL DEFAULT 10,
    "maxInputSizeMb" INTEGER NOT NULL DEFAULT 15,
    "supportedAspectRatios" "AspectRatio"[],
    "supportsVisualPrompt" BOOLEAN NOT NULL DEFAULT true,
    "costPerGeneration" DECIMAL(12,6),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanModel" (
    "planId" UUID NOT NULL,
    "modelId" UUID NOT NULL,

    CONSTRAINT "PlanModel_pkey" PRIMARY KEY ("planId","modelId")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT,
    "jobId" TEXT,
    "prompt" TEXT NOT NULL,
    "finalPrompt" TEXT,
    "aspectRatio" "AspectRatio" NOT NULL,
    "visualPromptUsed" BOOLEAN NOT NULL DEFAULT false,
    "sourceImageId" UUID NOT NULL,
    "visualPromptImageId" UUID,
    "resultOriginalId" UUID,
    "resultUserId" UUID,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "providerRequestId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "estimatedCost" DECIMAL(12,6),
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationReference" (
    "generationId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GenerationReference_pkey" PRIMARY KEY ("generationId","fileId")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "generationId" UUID,
    "status" "UsageStatus" NOT NULL,
    "usageDate" DATE NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_status_idx" ON "Profile"("status");

-- CreateIndex
CREATE INDEX "Profile_planId_idx" ON "Profile"("planId");

-- CreateIndex
CREATE INDEX "Profile_createdAt_idx" ON "Profile"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_endsAt_idx" ON "Subscription"("userId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_userId_status_idx" ON "Project"("userId", "status");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_path_key" ON "MediaFile"("path");

-- CreateIndex
CREATE INDEX "MediaFile_ownerId_type_createdAt_idx" ON "MediaFile"("ownerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "MediaFile_checksum_idx" ON "MediaFile"("checksum");

-- CreateIndex
CREATE INDEX "MediaFile_deletedAt_idx" ON "MediaFile"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectReference_fileId_idx" ON "ProjectReference"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectReference_projectId_fileId_key" ON "ProjectReference"("projectId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectReference_projectId_position_key" ON "ProjectReference"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_code_key" ON "AiModel"("code");

-- CreateIndex
CREATE INDEX "AiModel_active_priority_idx" ON "AiModel"("active", "priority");

-- CreateIndex
CREATE INDEX "PlanModel_modelId_idx" ON "PlanModel"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Generation_jobId_key" ON "Generation"("jobId");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_projectId_createdAt_idx" ON "Generation"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_status_queuedAt_idx" ON "Generation"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "Generation_deletedAt_idx" ON "Generation"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Generation_userId_idempotencyKey_key" ON "Generation"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationReference_fileId_idx" ON "GenerationReference"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationReference_generationId_position_key" ON "GenerationReference"("generationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_generationId_key" ON "UsageEvent"("generationId");

-- CreateIndex
CREATE INDEX "UsageEvent_userId_usageDate_status_idx" ON "UsageEvent"("userId", "usageDate", "status");

-- CreateIndex
CREATE INDEX "UsageEvent_status_expiresAt_idx" ON "UsageEvent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Notification_active_startsAt_endsAt_idx" ON "Notification"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_sourcePreviewId_fkey" FOREIGN KEY ("sourcePreviewId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_visualPromptId_fkey" FOREIGN KEY ("visualPromptId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReference" ADD CONSTRAINT "ProjectReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReference" ADD CONSTRAINT "ProjectReference_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModel" ADD CONSTRAINT "PlanModel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModel" ADD CONSTRAINT "PlanModel_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_visualPromptImageId_fkey" FOREIGN KEY ("visualPromptImageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_resultOriginalId_fkey" FOREIGN KEY ("resultOriginalId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_resultUserId_fkey" FOREIGN KEY ("resultUserId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationReference" ADD CONSTRAINT "GenerationReference_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationReference" ADD CONSTRAINT "GenerationReference_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Defense in depth for every application table in the exposed public schema.
alter table public."Profile" enable row level security;
alter table public."Plan" enable row level security;
alter table public."Subscription" enable row level security;
alter table public."Project" enable row level security;
alter table public."MediaFile" enable row level security;
alter table public."ProjectReference" enable row level security;
alter table public."AiModel" enable row level security;
alter table public."PlanModel" enable row level security;
alter table public."Generation" enable row level security;
alter table public."GenerationReference" enable row level security;
alter table public."UsageEvent" enable row level security;
alter table public."Notification" enable row level security;
alter table public."SystemSetting" enable row level security;
alter table public."AuditLog" enable row level security;

-- Authenticated clients may only read their own rows. Mutations stay server-only.
grant select on public."Profile", public."Subscription", public."Project", public."MediaFile",
  public."ProjectReference", public."Generation", public."GenerationReference", public."UsageEvent"
to authenticated;

create policy "profile_select_own"
on public."Profile" for select to authenticated
using ((select auth.uid()) = id);

create policy "subscription_select_own"
on public."Subscription" for select to authenticated
using ((select auth.uid()) = "userId");

create policy "project_select_own"
on public."Project" for select to authenticated
using ((select auth.uid()) = "userId");

create policy "media_file_select_own"
on public."MediaFile" for select to authenticated
using ((select auth.uid()) = "ownerId");

create policy "project_reference_select_own"
on public."ProjectReference" for select to authenticated
using (exists (
  select 1 from public."Project" p
  where p.id = "ProjectReference"."projectId"
    and p."userId" = (select auth.uid())
));

create policy "generation_select_own"
on public."Generation" for select to authenticated
using ((select auth.uid()) = "userId");

create policy "generation_reference_select_own"
on public."GenerationReference" for select to authenticated
using (exists (
  select 1 from public."Generation" g
  where g.id = "GenerationReference"."generationId"
    and g."userId" = (select auth.uid())
));

create policy "usage_event_select_own"
on public."UsageEvent" for select to authenticated
using ((select auth.uid()) = "userId");

-- No storage.objects policies are created intentionally: service-role uploads bypass
-- RLS only on the trusted server, while direct browser reads/writes remain denied.
