SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

NPM ?= npm
COMPOSE ?= docker compose
WEB_SERVICE ?= web
READY_PATTERN ?= Ready in
WAIT_TIMEOUT ?= 180
APP_URL ?= http://localhost:3000
SWAGGER_PATH ?= /api-doc

.DEFAULT_GOAL := help

.PHONY: help install dev build start lint test test-watch prisma-generate prisma-seed prisma-studio swagger-url swagger-check swagger-open docker-up docker-down docker-build docker-logs docker-ps docker-seed docker-wait-web docker-recreate docker-prune eslint-ignore lint-fix postman-seed postman-run postman-install postman-ci postman-db-up postman-db-down

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install Node dependencies
	@if [ -f package-lock.json ]; then \
		$(NPM) ci; \
	else \
		$(NPM) install; \
	fi

dev: ## Run Next.js in dev mode
	$(NPM) run dev

build: ## Build production bundle
	$(NPM) run build

start: ## Start production server
	$(NPM) run start

lint: ## Run linter
	$(NPM) run lint

test: ## Run tests once
	$(NPM) test

test-watch: ## Run tests in watch mode
	$(NPM) run test:watch

prisma-generate: ## Generate Prisma client
	npx prisma generate

prisma-seed: ## Seed database using Prisma seed script
	npx prisma db seed

prisma-studio: ## Open Prisma Studio
	npx prisma studio

swagger-url: ## Print Swagger UI URL
	@echo "$(APP_URL)$(SWAGGER_PATH)"

swagger-check: ## Check if Swagger endpoint is reachable (HTTP 200 expected)
	@url="$(APP_URL)$(SWAGGER_PATH)"; \
	status=$$(curl -s -o /dev/null -w "%{http_code}" "$$url"); \
	echo "Swagger endpoint: $$url"; \
	echo "HTTP status: $$status"; \
	if [ "$$status" != "200" ]; then \
		echo "Swagger is not ready. Start app with 'make dev' or 'make docker-up'."; \
		exit 1; \
	fi

swagger-open: ## Open Swagger UI in browser
	@url="$(APP_URL)$(SWAGGER_PATH)"; \
	echo "Opening $$url"; \
	if command -v xdg-open >/dev/null 2>&1; then xdg-open "$$url"; \
	elif command -v open >/dev/null 2>&1; then open "$$url"; \
	elif command -v start >/dev/null 2>&1; then start "" "$$url"; \
	else echo "Please open $$url manually in your browser."; fi

docker-up: ## Start containers in detached mode
	$(COMPOSE) up -d

docker-down: ## Stop containers and remove volumes
	$(COMPOSE) down -v

docker-build: ## Build containers without cache
	$(COMPOSE) build --no-cache

docker-logs: ## Tail docker logs
	$(COMPOSE) logs -f

docker-ps: ## Show running docker services
	$(COMPOSE) ps

docker-seed: ## Run seed inside web container
	$(COMPOSE) exec $(WEB_SERVICE) sh -lc 'rm -rf app/generated/prisma && npx prisma generate && npx prisma db seed'

docker-wait-web: ## Wait until web service responds over HTTP
	@echo "Waiting for $(WEB_SERVICE) to be ready..."
	@timeout_sec=$(WAIT_TIMEOUT); \
	start_time=$$(date +%s); \
	while true; do \
		container_id=$$($(COMPOSE) ps -q $(WEB_SERVICE) 2>/dev/null || true); \
		if [ -n "$$container_id" ] && [ "$$(docker inspect -f '{{.State.Running}}' $$container_id 2>/dev/null || true)" = "true" ]; then \
			if $(COMPOSE) exec -T $(WEB_SERVICE) sh -lc 'wget -q -O /dev/null http://127.0.0.1:3000' >/dev/null 2>&1; then \
				echo "$(WEB_SERVICE) is ready at $(APP_URL)."; \
				break; \
			fi; \
		fi; \
		now=$$(date +%s); \
		elapsed=$$((now - start_time)); \
		if [ $$elapsed -ge $$timeout_sec ]; then \
			echo "Timeout waiting for $(WEB_SERVICE) to respond at $(APP_URL)."; \
			$(COMPOSE) ps; \
			$(COMPOSE) logs --tail=50 $(WEB_SERVICE); \
			exit 1; \
		fi; \
		sleep 2; \
	done

docker-recreate: docker-down docker-build docker-up docker-wait-web docker-seed docker-logs ## Recreate stack, wait for web, seed DB and follow logs

docker-prune: ## Remove dangling docker images/containers/networks
	docker system prune -f

eslint-ignore: ## Create .eslintignore to exclude generated files from linting
	@echo "Creating .eslintignore (overwrites if exists)"
	@printf '/app/generated/\n/app/generated/prisma/\n/app/generated/prisma/**\n/app/generated/prisma/runtime/wasm.js\n' > .eslintignore
	@echo '.eslintignore created.'

lint-fix: ## Run linter with --fix to apply auto-fixable changes
	$(NPM) run lint -- --fix

# ---------------------------------------------------------------
# Postman / Newman — API tests
# Requires ENABLE_TEST_AUTH=true in the running dev server.
# Install once: make postman-install
# ---------------------------------------------------------------

POSTMAN_DIR ?= ./postman
NEWMAN_REPORT_DIR ?= $(POSTMAN_DIR)/reports

postman-install: ## Install newman + htmlextra reporter globally
	npm install -g newman newman-reporter-htmlextra

postman-seed: ## Apply the Postman test seed (creates known test users/spaces)
	npx ts-node --compiler-options '{"module":"CommonJS"}' $(POSTMAN_DIR)/seed-test.ts

postman-run: ## Run the Postman collection via Newman and generate HTML report
	@mkdir -p $(NEWMAN_REPORT_DIR)
	@stamp=$$(date +%Y%m%d-%H%M%S); \
	newman run $(POSTMAN_DIR)/Spot-On.postman_collection.json \
		-e $(POSTMAN_DIR)/Spot-On.postman_environment.json \
		--env-var "baseUrl=$(APP_URL)" \
		--reporters cli,htmlextra,json \
		--reporter-htmlextra-export $(NEWMAN_REPORT_DIR)/report-$$stamp.html \
		--reporter-json-export $(NEWMAN_REPORT_DIR)/report-$$stamp.json \
		--color on; \
	echo; echo "HTML report: $(NEWMAN_REPORT_DIR)/report-$$stamp.html"

postman-db-up: ## Start the test Postgres + MailHog containers
	$(COMPOSE) -f compose.test.yaml up -d db_test mailhog
	@echo "Waiting for test DB to be healthy..."
	@deadline=$$(( $$(date +%s) + 60 )); \
	while ! docker exec spot_on_db_test pg_isready -h 127.0.0.1 -p 5432 -U admin -d spot_on_test_db >/dev/null 2>&1 \
	      || ! nc -z localhost 5434 2>/dev/null; do \
		if [ $$(date +%s) -ge $$deadline ]; then echo "Timeout waiting for db_test"; exit 1; fi; \
		sleep 1; \
	done; \
	echo "Test DB is ready at localhost:5434."

postman-db-down: ## Stop and remove the test Postgres container
	$(COMPOSE) -f compose.test.yaml down -v

postman-ci: postman-db-up ## One-shot: bring up test DB, migrate, seed, start server, run Newman, stop server
	@set -euo pipefail; \
	if [ ! -f .env.test ]; then echo ".env.test not found in $$(pwd)"; exit 1; fi; \
	set -a; [ -f .env ] && . ./.env; . ./.env.test; set +a; \
	export ENABLE_TEST_AUTH=true; \
	export PORT="$${PORT:-3001}"; \
	export APP_URL="$${NEXTAUTH_URL:-http://localhost:$$PORT}"; \
	echo ">>> Using DATABASE_URL=$$DATABASE_URL"; \
	echo ">>> Running migrations + prisma generate"; \
	npx prisma migrate reset --force --skip-seed >/dev/null; \
	npx prisma generate >/dev/null; \
	echo ">>> Applying Postman test seed"; \
	npx ts-node --compiler-options '{"module":"CommonJS"}' $(POSTMAN_DIR)/seed-test.ts; \
	echo ">>> Starting Next.js on $$APP_URL (background)"; \
	mkdir -p $(NEWMAN_REPORT_DIR); \
	server_log=$$(mktemp); \
	($(NPM) run dev -- -p $$PORT >"$$server_log" 2>&1 &) ; \
	server_pid=$$(pgrep -f "next.* -p $$PORT" | head -n1 || true); \
	echo ">>> Waiting for $$APP_URL to respond (max $(WAIT_TIMEOUT)s)"; \
	deadline=$$(( $$(date +%s) + $(WAIT_TIMEOUT) )); \
	while ! curl -sf "$$APP_URL/api/leaderboard" -o /dev/null -H "X-Test-User-Id: test-host-user"; do \
		if [ $$(date +%s) -ge $$deadline ]; then \
			echo "Timeout. Last server log:"; tail -n 40 "$$server_log"; \
			kill $$server_pid 2>/dev/null || true; exit 1; \
		fi; sleep 2; \
	done; \
	echo ">>> Running Newman"; \
	stamp=$$(date +%Y%m%d-%H%M%S); \
	newman run $(POSTMAN_DIR)/Spot-On.postman_collection.json \
		-e $(POSTMAN_DIR)/Spot-On.postman_environment.json \
		--env-var "baseUrl=$$APP_URL" \
		--reporters cli,htmlextra,json \
		--reporter-htmlextra-export $(NEWMAN_REPORT_DIR)/report-$$stamp.html \
		--reporter-json-export $(NEWMAN_REPORT_DIR)/report-$$stamp.json \
		--color on; \
	newman_status=$$?; \
	echo ">>> Stopping dev server"; \
	pkill -f "next.* -p $$PORT" 2>/dev/null || true; \
	echo; echo "HTML report: $(NEWMAN_REPORT_DIR)/report-$$stamp.html"; \
	exit $$newman_status
