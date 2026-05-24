#!/bin/sh
set -e

echo "==> [predeploy] Pushing Prisma schema"
npx prisma db push --accept-data-loss --skip-generate

echo "==> [predeploy] Running seed"
npx tsx prisma/seed.ts

echo "==> [predeploy] Done"
