#!/bin/sh
set -eu

# Ключ GitHub Actions запускает только эту команду через SSH forced command.
request=${SSH_ORIGINAL_COMMAND:-}
if [ -z "$request" ] && [ "$#" -eq 1 ]; then
  request="deploy $1"
fi
case "$request" in
  "deploy "*) commit=${request#deploy } ;;
  *) echo "Ожидалась команда deploy с SHA коммита" >&2; exit 2 ;;
esac
case "$commit" in
  ""|*[!0-9a-f]*) echo "Некорректный SHA коммита" >&2; exit 2 ;;
esac
if [ "${#commit}" -ne 40 ]; then
  echo "Некорректная длина SHA коммита" >&2
  exit 2
fi

exec 9>/run/lock/ruvie-deploy.lock
flock 9
cd /opt/ruvie

if [ "$(git branch --show-current)" != master ] || [ -n "$(git status --porcelain)" ]; then
  echo "Для деплоя нужна чистая ветка master на сервере" >&2
  exit 1
fi

git fetch origin refs/heads/master:refs/remotes/origin/master
latest=$(git rev-parse refs/remotes/origin/master)
if [ "$commit" != "$latest" ]; then
  echo "Пропускаю устаревший запуск: master уже указывает на другой коммит"
  exit 0
fi
git merge-base --is-ancestor HEAD "$latest" || {
  echo "Ветка сервера не может быть обновлена быстрым слиянием" >&2
  exit 1
}

git merge --ff-only "$latest"
docker compose config -q
docker compose build web worker admin migrate

stopped=0
migration_started=0
on_exit() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "Деплой завершился с ошибкой; проверьте контейнеры и логи" >&2
    if [ "$stopped" -eq 1 ] && [ "$migration_started" -eq 0 ]; then
      docker compose start web worker || true
    fi
  fi
}
trap on_exit EXIT

docker compose stop -t 240 worker
stopped=1
docker compose stop -t 30 web

short_commit=$(printf '%.12s' "$commit")
backup_dir=/var/backups/ruvie/deploy-$(date -u +%Y%m%d-%H%M%S)-$short_commit
install -d -m 700 "$backup_dir"
docker exec ruvie-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/db.dump"
tar -C /var/lib/docker/volumes/ruvie_media_data/_data -czf "$backup_dir/media.tar.gz" .
chmod 600 "$backup_dir/db.dump" "$backup_dir/media.tar.gz"
docker exec -i ruvie-postgres-1 pg_restore -l < "$backup_dir/db.dump" >/dev/null
tar -tzf "$backup_dir/media.tar.gz" >/dev/null

migration_started=1
docker compose up -d --no-build

ready=0
for attempt in $(seq 1 60); do
  if curl -fsS -m 5 http://127.0.0.1:3000/api/health/ready >/dev/null 2>&1 \
    && curl -fsS -m 5 -o /dev/null http://127.0.0.1:8080/ \
    && [ "$(docker inspect -f '{{.State.Health.Status}}' ruvie-worker-1 2>/dev/null)" = healthy ]; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "Контейнеры не прошли проверку после деплоя" >&2
  docker compose ps >&2
  exit 1
fi

echo "Развёрнут коммит $commit"
