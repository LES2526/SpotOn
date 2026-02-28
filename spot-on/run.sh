#!/bin/bash
set -euo pipefail

if [[ $1 == "1" ]]; then
	docker compose down -v
else
	docker compose down
fi

docker compose build --no-cache
docker compose up
