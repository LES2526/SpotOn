#!/bin/bash
# Apply migrations (run inside the web container)
docker compose exec web npx prisma migrate dev --name remove_nextauth_map

# Recreate containers and build images
docker compose down -v
docker compose build --no-cache

# Start in background so we can run the seed command after services are up
docker compose up -d

# Run Prisma seed (will execute the script defined in package.json -> prisma.seed)
docker compose exec web npx prisma db seed

# Follow logs in foreground
docker compose logs -f
