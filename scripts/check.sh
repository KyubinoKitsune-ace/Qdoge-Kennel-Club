#!/usr/bin/env bash
# =============================================================================
# Qdoge Kennel Club - Pre-deploy gate
# =============================================================================
# Run before any rebuild/restart to ensure:
#   - docker compose files are valid
#   - Frontend lint/build succeeds
#   - Backend lint + tests succeed (or at least app import boots)
#   - Optional DB sanity check
#
# Usage:
#   ./scripts/check.sh
#   ./scripts/check.sh --with-db
# =============================================================================

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WITH_DB=false
for arg in "$@"; do
  case "$arg" in
    --with-db) WITH_DB=true ;;
    --help|-h)
      echo "Usage: ./scripts/check.sh [--with-db]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: ./scripts/check.sh [--with-db]" >&2
      exit 1
      ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() {
  echo -e "${RED}[FAIL] $*${NC}" >&2
  exit 1
}

ok() {
  echo -e "${GREEN}[OK] $*${NC}"
}

section() {
  echo ""
  echo -e "${YELLOW}--- $* ---${NC}"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

validate_compose_file() {
  local compose_file="$1"
  [ -f "$compose_file" ] || fail "Compose file not found: $compose_file"

  if ! docker compose -f "$compose_file" config >/dev/null 2>&1; then
    echo "Compose validation failed for: $compose_file"
    docker compose -f "$compose_file" config || true
    fail "Invalid compose file: $compose_file"
  fi
  ok "Compose valid: $compose_file"
}

# -----------------------------------------------------------------------------
# 1. Docker Compose validation
# -----------------------------------------------------------------------------
section "Docker Compose config"
require_cmd docker
validate_compose_file "docker-compose.yml"
validate_compose_file "docker-compose.dev.yml"

# -----------------------------------------------------------------------------
# 2. Frontend checks
# -----------------------------------------------------------------------------
section "Frontend: lint"
require_cmd pnpm
cd "$REPO_ROOT"
pnpm lint
ok "Frontend lint passed"

section "Frontend: build"
export VITE_API_URL="${VITE_API_URL:-/api}"
pnpm build
ok "Frontend build passed"

# -----------------------------------------------------------------------------
# 3. Backend checks
# -----------------------------------------------------------------------------
section "Backend: dependencies + lint + tests"
require_cmd python3
cd "$REPO_ROOT/backend"

if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
  fail "Backend requires Python 3.11+ (current: $(python3 --version 2>&1))"
fi

python3 -m pip install -q --disable-pip-version-check -r requirements.txt -r requirements-dev.txt
ok "Backend dependencies installed"

python3 -m ruff check .
ok "Backend lint passed"

# Minimal env so import/tests don't depend on an external DB.
export DATABASE_URL="${DATABASE_URL:-postgresql+asyncpg://user:pass@localhost:5432/db}"

set +e
pytest -q
PYTEST_EXIT=$?
set -e

if [ "$PYTEST_EXIT" -eq 0 ]; then
  ok "Backend tests passed"
elif [ "$PYTEST_EXIT" -eq 5 ]; then
  section "Backend: fallback boot check (no tests collected)"
  python3 -c "from app.main import app; assert app is not None; print('App import/boot check passed')"
  ok "Backend app import/boot check passed"
else
  fail "Backend tests failed"
fi

# -----------------------------------------------------------------------------
# 4. Optional DB sanity
# -----------------------------------------------------------------------------
cleanup_db() {
  cd "$REPO_ROOT"
  docker compose -p qdoge-prod stop db >/dev/null 2>&1 || true
}

if [ "$WITH_DB" = true ]; then
  section "DB sanity (optional)"
  cd "$REPO_ROOT"

  if [ -f ".env" ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
  fi

  if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
    echo "Skipping DB sanity: POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB are not set."
  else
    trap cleanup_db EXIT
    docker compose -p qdoge-prod up -d db
    sleep 5
    docker compose -p qdoge-prod run --rm --no-deps backend python - <<'PY'
from app.core.db import init_db
init_db(retries=5, delay=2)
print("DB connectivity/tables check passed")
PY
    ok "DB sanity check passed"
    trap - EXIT
    cleanup_db
  fi
fi

echo ""
echo -e "${GREEN}All checks passed. Safe to rebuild/restart prod and dev stacks.${NC}"
