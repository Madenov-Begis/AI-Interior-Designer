-- Business data is server-only. Supabase Auth provides identity, while every
-- application query is executed through Prisma after an ownership check.
revoke all on public."Profile", public."Plan", public."Subscription", public."Project",
  public."MediaFile", public."ProjectReference", public."AiModel", public."PlanModel",
  public."Generation", public."GenerationReference", public."UsageEvent",
  public."Notification", public."SystemSetting", public."AuditLog"
from anon, authenticated;

drop policy if exists "profile_select_own" on public."Profile";
drop policy if exists "subscription_select_own" on public."Subscription";
drop policy if exists "project_select_own" on public."Project";
drop policy if exists "media_file_select_own" on public."MediaFile";
drop policy if exists "project_reference_select_own" on public."ProjectReference";
drop policy if exists "generation_select_own" on public."Generation";
drop policy if exists "generation_reference_select_own" on public."GenerationReference";
drop policy if exists "usage_event_select_own" on public."UsageEvent";
