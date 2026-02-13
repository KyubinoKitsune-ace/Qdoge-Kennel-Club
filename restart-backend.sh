#!/bin/bash
# Script to restart backend with new environment variables

echo "=========================================="
echo "Restarting Backend with New Config"
echo "=========================================="
echo ""

# Enforce preflight checks before restart/rebuild actions.
if [ ! -f "./scripts/check.sh" ]; then
    echo "❌ scripts/check.sh not found"
    exit 1
fi

echo "Running preflight checks..."
bash ./scripts/check.sh
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in root directory!"
    exit 1
fi

# Check if ADMIN_API_KEY is in .env
if ! grep -q "^ADMIN_API_KEY=" .env; then
    echo "❌ ADMIN_API_KEY not found in .env"
    echo "Please add: ADMIN_API_KEY=your-key-here"
    exit 1
fi

API_KEY=$(grep "^ADMIN_API_KEY=" .env | cut -d'=' -f2)
echo "✅ Found ADMIN_API_KEY: ${API_KEY:0:10}...${API_KEY: -4}"
echo ""

# Determine which docker-compose file to use
if [ -f "docker-compose.dev.yml" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    CONTAINER_NAME="qdoge-backend-dev"
else
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER_NAME="qdoge-backend"
fi

echo "Using: $COMPOSE_FILE"
echo "Container: $CONTAINER_NAME"
echo ""

# Stop and remove the backend container
echo "Stopping backend container..."
docker compose -f $COMPOSE_FILE stop backend
docker compose -f $COMPOSE_FILE rm -f backend

echo ""
echo "Starting backend container with new environment..."
docker compose -f $COMPOSE_FILE up -d backend

echo ""
echo "Waiting for backend to start..."
sleep 5

# Check if container is running
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ Backend container is running"
    echo ""
    
    # Check if environment variable is loaded
    echo "Verifying ADMIN_API_KEY in container..."
    if docker exec $CONTAINER_NAME env | grep -q "ADMIN_API_KEY="; then
        CONTAINER_KEY=$(docker exec $CONTAINER_NAME env | grep "ADMIN_API_KEY=" | cut -d'=' -f2)
        echo "✅ ADMIN_API_KEY loaded: ${CONTAINER_KEY:0:10}...${CONTAINER_KEY: -4}"
    else
        echo "❌ ADMIN_API_KEY not found in container environment"
        echo "Check docker-compose.yml environment section"
    fi
    
    echo ""
    echo "Backend logs (last 20 lines):"
    echo "----------------------------------------"
    docker logs --tail 20 $CONTAINER_NAME
    
else
    echo "❌ Backend container failed to start"
    echo ""
    echo "Logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
echo ""
echo "Test the admin endpoint:"
echo "curl -X PUT \"http://localhost:8000/api/admin/epochs/197/total-airdrop?total_airdrop=1000000\" \\"
echo "  -H \"X-Admin-API-Key: $API_KEY\""
echo ""
