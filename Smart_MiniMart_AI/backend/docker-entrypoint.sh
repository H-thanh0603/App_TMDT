#!/bin/sh
set -e
echo "[entrypoint] NODE_ENV=${NODE_ENV:-production} PORT=${PORT:-4000}"

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is required"
  exit 1
fi

echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

# Q78: seed demo/crawl/purge KHÔNG BAO GIỜ chạy trên prod qua entrypoint.
# Chỉ seed base idempotent khi RUN_SEED_ON_BOOT=true; script demo/crawl/purge
# phải chạy tay ở local, entrypoint chặn cứng nếu NODE_ENV=production.
if [ "${RUN_SEED_ON_BOOT}" = "true" ]; then
  echo "[entrypoint] RUN_SEED_ON_BOOT=true → seed base users/products (idempotent upserts)..."
  # seed.ts uses ts-node; in prod image we may not have ts-node.
  # Prefer a one-shot job on first deploy instead. Skip if unavailable.
  if [ -f node_modules/.bin/ts-node ]; then
    npx ts-node -r tsconfig-paths/register prisma/seed.ts || echo "[entrypoint] seed skipped/failed (non-fatal)"
  else
    echo "[entrypoint] ts-node not in image — seed manually after deploy"
  fi
fi
if [ "${NODE_ENV:-production}" = "production" ]; then
  case " ${SEED_GUARD:-} " in
    *demo*|*crawl*|*purge*)
      echo "[entrypoint] ERROR: SEED_GUARD chứa demo/crawl/purge trên production — từ chối boot"
      exit 1;;
  esac
fi

echo "[entrypoint] starting NestJS..."
exec node dist/src/main.js
