# Quick Fix for 503 Error

## The Problem
You got **"Admin API key not configured on server"** because Docker wasn't loading the environment variable.

## The Fix (3 Steps)

### Step 1: Verify Root `.env` Has the Key ✅

```bash
cd /var/Qdoge-Kennel-Club
grep ADMIN_API_KEY .env
```

Should show:
```
ADMIN_API_KEY=4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4
```

✅ **Already done!**

### Step 2: Restart Backend Container

```bash
cd /var/Qdoge-Kennel-Club
./restart-backend.sh
```

Or manually:
```bash
docker-compose -f docker-compose.dev.yml down backend
docker-compose -f docker-compose.dev.yml up -d backend
```

### Step 3: Test It Works

```bash
curl -X PUT "http://72.60.123.249:8000/api/admin/epochs/197/total-airdrop?total_airdrop=2332502" \
  -H "X-Admin-API-Key: 4NdAOO8JsEkEkl82l_Ct7ZaASZoZ2k49hj-vZqO4"
```

Should return **200 OK** (not 503).

## That's It!

The issue was that Docker Compose needs environment variables in the **root `.env` file**, not `backend/.env`.

Now it's fixed and will work after you restart the container.
