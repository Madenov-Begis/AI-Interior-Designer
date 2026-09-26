# syntax=docker/dockerfile:1
# Образы сайта, worker и шлюза.
FROM node:24.15.0-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json ./admin/package.json
COPY prisma ./prisma
COPY prisma.config.ts prisma.timeweb.config.ts prisma.local-docker.config.ts ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS source
COPY . .

FROM source AS web-build
# Только публичные параметры. Credentials запрещены в build arguments.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG STORAGE_PUBLIC_ORIGIN=http://localhost:3000
ENV NEXT_OUTPUT=standalone
RUN pnpm build

FROM node:24.15.0-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=web-build --chown=node:node /app/.next/standalone ./
COPY --from=web-build --chown=node:node /app/.next/static ./.next/static
COPY --from=web-build --chown=node:node /app/public ./public
COPY --from=web-build --chown=node:node /app/docs/legal ./docs/legal
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM source AS admin-build
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_SENTRY_DSN=
RUN pnpm admin:build

FROM source AS worker-build
RUN pnpm worker:build
RUN pnpm worker:ops:build

FROM dependencies AS worker
ENV NODE_ENV=production
COPY --from=worker-build --chown=node:node /app/build/worker /app/build/worker
COPY --from=source /app/docker/migrate.sh /app/migrate.sh
USER node
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "try { const s=JSON.parse(require('fs').readFileSync(process.env.WORKER_HEARTBEAT_FILE || '/tmp/ruvie-worker-heartbeat.json')); process.exit(Date.now()-s.at<30000?0:1); } catch { process.exit(1); }"
CMD ["node", "build/worker/generation.mjs"]

# Один Caddy обслуживает HTTPS приложения и статическую админку.
FROM caddy:2.10.2-alpine AS gateway
COPY --from=admin-build /app/admin/dist /srv/admin
COPY docker/Caddyfile /etc/caddy/Caddyfile

# Локальная HTTP-проверка админки.
FROM caddy:2.10.2-alpine AS admin-preview
COPY --from=admin-build /app/admin/dist /srv/admin
COPY docker/Caddyfile.preview /etc/caddy/Caddyfile
EXPOSE 8080
