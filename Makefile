# Qdoge Kennel Club - common targets
#
# Safety gate:
#   - All rebuild/restart targets run `make check` first.
#   - Use *-unsafe targets only when you intentionally want to bypass checks.
#
# Prod: docker compose -p qdoge-prod
# Dev:  docker compose -p qdoge-dev -f docker-compose.dev.yml

.PHONY: check check-with-db deploy up up-unsafe down restart-prod dev-up dev-up-unsafe dev-down restart-dev help

check:
	./scripts/check.sh

check-with-db:
	./scripts/check.sh --with-db

# --- Production (docker compose -p qdoge-prod) ---
deploy: check
	docker compose -p qdoge-prod up -d --build

up: check
	docker compose -p qdoge-prod up -d --build

up-unsafe:
	docker compose -p qdoge-prod up -d --build

down:
	docker compose -p qdoge-prod down

restart-prod: check
	docker compose -p qdoge-prod down
	docker compose -p qdoge-prod up -d --build

# --- Development (docker compose -p qdoge-dev -f docker-compose.dev.yml) ---
dev-up: check
	docker compose -p qdoge-dev -f docker-compose.dev.yml up -d --build

dev-up-unsafe:
	docker compose -p qdoge-dev -f docker-compose.dev.yml up -d --build

dev-down:
	docker compose -p qdoge-dev -f docker-compose.dev.yml down

restart-dev: check
	docker compose -p qdoge-dev -f docker-compose.dev.yml down
	docker compose -p qdoge-dev -f docker-compose.dev.yml up -d --build

help:
	@echo "Preflight:"
	@echo "  make check          - compose validate + frontend lint/build + backend lint/tests"
	@echo "  make check-with-db  - same + optional DB sanity check"
	@echo ""
	@echo "Production:"
	@echo "  make deploy        - check, then prod up"
	@echo "  make up            - check, then prod up"
	@echo "  make restart-prod  - check, then prod down/up"
	@echo "  make down          - prod down"
	@echo ""
	@echo "Development:"
	@echo "  make dev-up        - check, then dev up"
	@echo "  make restart-dev   - check, then dev down/up"
	@echo "  make dev-down      - dev down"
	@echo ""
	@echo "Unsafe bypass (not recommended):"
	@echo "  make up-unsafe"
	@echo "  make dev-up-unsafe"
	@echo ""
	@echo "VPS deploy:"
	@echo "  ./deploy.sh  (runs remote scripts/check.sh before compose up)"
