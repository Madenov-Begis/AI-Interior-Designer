-- Remove unused runtime settings and administrative audit storage.
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";
DROP TABLE "AuditLog";
DROP TABLE "SystemSetting";
