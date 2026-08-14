BEGIN;

-- These tables are accessed only by Prisma through the direct PostgreSQL
-- connection. Keep them out of the Supabase Data API for every client role.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CreditPackage" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations"
FROM anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE public."CreditPackage"
FROM anon, authenticated, service_role;

-- Prisma migrations create tables as postgres. Require future Data API access
-- to be granted explicitly instead of exposing new tables automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE USAGE, SELECT ON SEQUENCES
FROM anon, authenticated, service_role;

COMMIT;
