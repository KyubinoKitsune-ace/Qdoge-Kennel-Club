#!/bin/bash
# ============================================================================
# Qdoge Kennel Club - VPS Deployment Script
# ============================================================================
# Usage: ./deploy.sh
# 
# This script deploys the full stack to your VPS:
# - Frontend (Vite + React + Tailwind)
# - Backend (FastAPI)
# - Database (PostgreSQL)
# - Reverse Proxy (Nginx)
# ============================================================================

set -Eeuo pipefail

# Configuration
VPS_HOST="root@72.60.123.249"
VPS_PORT="22"
REMOTE_DIR="/opt/qdoge-kennel-club"

echo "🚀 Deploying Qdoge Kennel Club to VPS..."

# Step 1: Create remote directory
echo "📁 Creating remote directory..."
ssh -p $VPS_PORT $VPS_HOST "mkdir -p $REMOTE_DIR"

# Step 2: Sync files to VPS (excluding node_modules, .git, etc.)
echo "📤 Syncing files to VPS..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '__pycache__' \
    --exclude '.venv' \
    --exclude 'venv' \
    --exclude '*.log' \
    -e "ssh -p $VPS_PORT" \
    ./ $VPS_HOST:$REMOTE_DIR/

# Step 3: Deploy on VPS
echo "🐳 Building and starting containers on VPS..."
ssh -p $VPS_PORT $VPS_HOST << 'ENDSSH'
cd /opt/qdoge-kennel-club

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit /opt/qdoge-kennel-club/.env with your actual credentials!"
fi

# Create SSL directory
mkdir -p nginx/ssl

# Preflight gate before any rebuild/restart
echo "Running preflight checks on VPS..."
bash ./scripts/check.sh

# Pull latest images and rebuild only after checks pass
docker compose down --remove-orphans || true
docker compose build --no-cache
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Show status
docker compose ps
echo ""
echo "✅ Deployment complete!"
echo "🌐 Access your app at: http://72.60.123.249"
echo "📊 Backend API at: http://72.60.123.249/api"
ENDSSH

echo ""
echo "🎉 Deployment finished successfully!"
