#!/bin/bash
docker compose down -v
docker compose build --no-cache
docker compose up -d

echo "Waiting for Next.js to be ready..."
until docker compose logs web 2>&1 | grep -q "Ready in"; do
    sleep 2
done

docker compose exec web npx prisma db seed
docker compose logs -f
