# Fix: "Admin API key not configured on server" (503 Error)

## Problem

You set `ADMIN_API_KEY` in `backend/.env` but still got **503 error** saying "Admin API key not configured on server".

## Root Cause

**Docker Compose reads environment variables from the ROOT `.env` file, not `backend/.env`.**

```
❌ Wrong: backend/.env (Docker ignores this)
✅ Correct: .env (root directory)
```

## Solution (Already Applied)

### 1. Added `ADMIN_API_KEY` to Root `.env`

File: `.env` (in root directory)
```bash
ADMIN_API_KEY=4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
TRADE_UPDATE_INTERVAL=300
TRADE_ISSUER=QDOGEEESKYPAICECHEAHOXPULEOADTKGEJHAVYPFKHLEWGXXZQUGIGMBUTZE
TRADE_ASSET=QDOGE
```

### 2. Updated `docker-compose.dev.yml`

Added environment variables to backend service:
```yaml
backend:
  environment:
    ADMIN_API_KEY: ${ADMIN_API_KEY}
    TRADE_UPDATE_INTERVAL: ${TRADE_UPDATE_INTERVAL:-300}
    TRADE_ISSUER: ${TRADE_ISSUER}
    TRADE_ASSET: ${TRADE_ASSET}
```

### 3. Updated `docker-compose.yml` (Production)

Same changes for production environment.

## Now Restart the Backend

### Option 1: Use the Restart Script (Easiest)

```bash
cd /var/Qdoge-Kennel-Club
./restart-backend.sh
```

This script will:
- ✅ Check if ADMIN_API_KEY is in .env
- ✅ Stop and remove the old container
- ✅ Start a new container with the environment variables
- ✅ Verify the key is loaded
- ✅ Show logs

### Option 2: Manual Restart

```bash
cd /var/Qdoge-Kennel-Club

# Stop and remove backend
docker-compose -f docker-compose.dev.yml stop backend
docker-compose -f docker-compose.dev.yml rm -f backend

# Start backend with new environment
docker-compose -f docker-compose.dev.yml up -d backend

# Check logs
docker logs -f qdoge-backend-dev
```

## Verify It's Fixed

### 1. Check Environment Variable in Container

```bash
docker exec qdoge-backend-dev env | grep ADMIN_API_KEY
```

Expected output:
```
ADMIN_API_KEY=4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
```

### 2. Test the Endpoint

```bash
curl -X PUT "http://72.60.123.249:8000/api/admin/epochs/197/total-airdrop?total_airdrop=2332502" \
  -H "X-Admin-API-Key: 4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4"
```

**Before Fix**: 503 "Admin API key not configured on server"
**After Fix**: 200 OK with epoch data (or 404 if epoch doesn't exist)

### 3. Use Swagger UI

1. Go to: http://72.60.123.249:8000/docs
2. Click **"Authorize"** button (🔒)
3. Enter: `4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4`
4. Click "Authorize" → "Close"
5. Try the endpoint: `PUT /api/admin/epochs/197/total-airdrop`

**Should work now!** ✅

## Why This Happened

### Docker Compose Environment Loading Order:

1. Shell environment variables
2. **Root `.env` file** ← Docker Compose reads THIS
3. `environment:` section in docker-compose.yml
4. `env_file:` directive (if specified)
5. Dockerfile ENV

### What You Did:

- ❌ Added `ADMIN_API_KEY` to `backend/.env`
- ❌ Docker Compose doesn't read `backend/.env`
- ❌ Container never received the environment variable

### What Was Fixed:

- ✅ Added `ADMIN_API_KEY` to root `.env`
- ✅ Added to `docker-compose.dev.yml` environment section
- ✅ Container now receives the environment variable

## File Structure

```
/var/Qdoge-Kennel-Club/
├── .env                          ← Docker Compose reads THIS
│   └── ADMIN_API_KEY=...         ← Added here ✅
│
├── docker-compose.dev.yml        ← Updated ✅
│   └── backend:
│       └── environment:
│           └── ADMIN_API_KEY: ${ADMIN_API_KEY}
│
└── backend/
    └── .env                      ← Only for local dev (not Docker)
        └── ADMIN_API_KEY=...     ← Docker ignores this
```

## Quick Reference

### Your Admin API Key:
```
4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
```

### Restart Backend:
```bash
cd /var/Qdoge-Kennel-Club
./restart-backend.sh
```

### Test Endpoint:
```bash
curl -X PUT "http://72.60.123.249:8000/api/admin/epochs/197/total-airdrop?total_airdrop=2332502" \
  -H "X-Admin-API-Key: 4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4"
```

### Check Container Environment:
```bash
docker exec qdoge-backend-dev env | grep ADMIN_API_KEY
```

## Summary

✅ **Fixed**: Added `ADMIN_API_KEY` to root `.env` and docker-compose files

✅ **Next**: Run `./restart-backend.sh` to apply changes

✅ **Result**: Admin endpoint will work without 503 error

The key insight: **Docker Compose environment variables must be in the root `.env` file and passed through the `environment:` section in docker-compose.yml**.
