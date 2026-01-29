# Docker Environment Variable Fix

## The Problem

You were getting **"Admin API key not configured on server"** error because:

1. ❌ `ADMIN_API_KEY` was only in `backend/.env`
2. ❌ Docker Compose reads from **root `.env`** file, not `backend/.env`
3. ❌ `docker-compose.dev.yml` wasn't passing `ADMIN_API_KEY` to the container

## The Solution

### ✅ Fixed Files

1. **Root `.env` file** - Added `ADMIN_API_KEY`
2. **`docker-compose.dev.yml`** - Added environment variables to backend service
3. **`docker-compose.yml`** - Added environment variables to backend service (production)

### How Docker Compose Environment Variables Work

```
Root Directory
├── .env                          ← Docker Compose reads THIS file
├── docker-compose.dev.yml        ← Uses ${ADMIN_API_KEY} from root .env
└── backend/
    └── .env                      ← Python code reads this (but NOT in Docker!)
```

**Important**: When running in Docker:
- Docker Compose reads variables from **root `.env`**
- These are passed to the container via `environment:` section
- The `backend/.env` file is **ignored** by Docker Compose

## Steps to Fix (Already Done)

### Step 1: Add to Root `.env`
```bash
# File: .env (root directory)
ADMIN_API_KEY=4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
TRADE_UPDATE_INTERVAL=300
TRADE_ISSUER=QDOGEEESKYPAICECHEAHOXPULEOADTKGEJHAVYPFKHLEWGXXZQUGIGMBUTZE
TRADE_ASSET=QDOGE
```

### Step 2: Update `docker-compose.dev.yml`
```yaml
backend:
  environment:
    DATABASE_URL: "..."
    ADMIN_API_KEY: ${ADMIN_API_KEY}          # ← Added
    TRADE_UPDATE_INTERVAL: ${TRADE_UPDATE_INTERVAL:-300}  # ← Added
    TRADE_ISSUER: ${TRADE_ISSUER}           # ← Added
    TRADE_ASSET: ${TRADE_ASSET}             # ← Added
```

### Step 3: Restart Container
```bash
cd /var/Qdoge-Kennel-Club
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

## Verify It's Working

### Method 1: Check Container Environment
```bash
docker exec qdoge-backend-dev env | grep ADMIN_API_KEY
```

Expected output:
```
ADMIN_API_KEY=4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
```

### Method 2: Test the Endpoint
```bash
curl -X PUT "http://72.60.123.249:8000/api/admin/epochs/197/total-airdrop?total_airdrop=2332502" \
  -H "X-Admin-API-Key: 4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4"
```

Should return **200 OK** (not 503).

### Method 3: Check Logs
```bash
docker logs qdoge-backend-dev
```

Should start without errors.

## Why This Happened

Docker Compose has a specific order for loading environment variables:

1. **Shell environment** (highest priority)
2. **Root `.env` file** ← Docker Compose reads this
3. **`environment:` in docker-compose.yml**
4. **`env_file:` directive** (if specified)
5. **Dockerfile ENV** (lowest priority)

The `backend/.env` file is **only used when running Python directly** (not in Docker).

## For Future Reference

When adding new environment variables:

1. ✅ Add to **root `.env`** file
2. ✅ Add to `docker-compose.dev.yml` environment section
3. ✅ Add to `docker-compose.yml` environment section (production)
4. ✅ Add to `env.example` (for documentation)
5. ✅ Optionally add to `backend/.env` (for local development without Docker)

## Quick Commands

### Restart with new environment variables:
```bash
cd /var/Qdoge-Kennel-Club
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

### Check if variable is loaded:
```bash
docker exec qdoge-backend-dev env | grep ADMIN_API_KEY
```

### View logs:
```bash
docker logs -f qdoge-backend-dev
```

### Test endpoint:
```bash
curl -X PUT "http://localhost:8000/api/admin/epochs/197/total-airdrop?total_airdrop=1000000" \
  -H "X-Admin-API-Key: 4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4"
```

## Summary

✅ **Root cause**: Environment variables must be in root `.env` and passed via `docker-compose.yml`

✅ **Fixed**: Added `ADMIN_API_KEY` to root `.env` and both docker-compose files

✅ **Next step**: Restart containers to load the new configuration
