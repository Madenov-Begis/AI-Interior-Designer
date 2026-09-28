# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.25.0

# Установка зависимостей
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json ./admin/package.json
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile && pnpm prisma:generate

# Исходный код
FROM dependencies AS source
COPY . .

# Сборка Next.js
FROM source AS web-build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG STORAGE_PUBLIC_ORIGIN=http://localhost:3000
ENV NEXT_OUTPUT=standalone
RUN pnpm build

# Web сервис (Next.js)
FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN mkdir -p /data/media && chown -R node:node /data/media
COPY --from=web-build --chown=node:node /app/.next/standalone ./
COPY --from=web-build --chown=node:node /app/.next/static ./.next/static
COPY --from=web-build --chown=node:node /app/public ./public
COPY --from=web-build --chown=node:node /app/docs/legal ./docs/legal
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

# Worker сервис (обработка очереди генераций)
FROM dependencies AS worker
ENV NODE_ENV=production
RUN mkdir -p /data/media && chown -R node:node /data/media
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
RUN pnpm exec esbuild scripts/generation-worker.ts --bundle --platform=node --target=node24 --format=esm --packages=external --alias:server-only=./scripts/server-only-empty.js --outfile=dist/worker.mjs
USER node
CMD ["node", "dist/worker.mjs"]

# Сборка Admin панели
FROM source AS admin-build
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_SENTRY_DSN=
RUN pnpm admin:build

# Admin сервис (Nginx)
FROM nginx:alpine AS admin
COPY --from=admin-build /app/admin/dist /usr/share/nginx/html
RUN printf 'server {\n    listen 80;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
