#!/bin/sh
set -eu
password=$(cat /run/secrets/postgres_migrator_password)
case "$password" in *[!0-9a-f]*|'') echo 'Некорректный пароль мигратора.' >&2; exit 1;; esac
export DIRECT_URL="postgresql://ruvie_migrator:${password}@postgres:5432/ruvie"
exec pnpm exec prisma migrate deploy --config prisma.timeweb.config.ts
