# Admin and hardening implementation plan

1. Enforce active `ADMIN` profiles on every administrative page and endpoint.
2. Add dashboard statistics and Prisma-backed management APIs for users, generations, models, plans, notifications, and settings.
3. Write audit records for every administrative mutation without storing secrets or request bodies.
4. Add project update, archive, and duplicate workflows plus missing public REST contracts.
5. Apply rate limiting to costly routes, SSRF-safe URL imports, private signed URLs, and security response headers.
6. Verify Prisma schema, generated client, TypeScript, ESLint, production build, and absence of Supabase Data API usage.

External infrastructure remains configurable: fake AI is the default until Vertex credentials are supplied; database migrations require a working Postgres password.
