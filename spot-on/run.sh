#!/bin/bash
docker compose exec web npx prisma migrate dev --name remove_nextauth_map
docker compose down -v
docker compose build --no-cache
docker compose up
