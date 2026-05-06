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

.PHONY: help install dev build start lint test test-watch prisma-generate prisma-seed prisma-studio swagger-url swagger-check swagger-open docker-up docker-down docker-build docker-logs docker-ps docker-seed docker-wait-web docker-recreate docker-prune eslint-ignore lint-fix

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
