# Zealy Integration Troubleshooting Guide

## Why You Can't See the ✅ Icon

There are several possible reasons:

### 1. Database Table Not Created
The `zealy_user` table needs to be created in the database.

**Solution:**
```bash
# Restart the backend to trigger table creation
cd backend
docker-compose restart backend
# OR
docker-compose down && docker-compose up -d
```

The `init_db()` function runs on startup and creates all tables including `zealy_user`.

### 2. No Zealy Data Synced Yet
Even if the table exists, it might be empty.

**Check if data exists:**
```bash
# Call the debug endpoint
curl http://localhost:8000/api/zealy/users
```

**Expected response:**
```json
{
  "total": 322,
  "users": [
    {
      "user_id": "...",
      "name": "...",
      "address": "WALLET_ADDRESS",
      "xp": 102,
      "synced_at": "2025-01-29T..."
    }
  ]
}
```

**If empty (total: 0):**
```bash
# Manually trigger sync
curl -X POST http://localhost:8000/api/zealy/sync
```

### 3. Background Task Not Running
The Zealy sync runs every 10 minutes automatically.

**Check backend logs:**
```bash
docker-compose logs -f backend
```

**Look for:**
```
[Startup] Background Zealy sync started (interval: 600s)
[Background] Syncing Zealy users...
[Background] Zealy sync completed: {'fetched': 322, 'upserted': 322}
```

**If not running:**
- Backend might not have started properly
- Check for errors in logs

### 4. Wallet Addresses Don't Match
The Zealy users must have their Qubic wallet address set in Zealy.

**Check a specific wallet:**
```bash
# Query the database
docker exec -it <postgres_container> psql -U <user> -d <database>
SELECT * FROM zealy_user WHERE address = 'WALLET_ADDRESS_HERE';
```

**If no results:**
- User hasn't set their wallet address in Zealy
- Wallet address format doesn't match

### 5. Frontend Not Receiving Data
The API might not be returning the flags.

**Test the API directly:**
```bash
# Check trades endpoint
curl http://localhost:8000/api/epochs/197/trades | jq '.trades[0]'
```

**Expected response should include:**
```json
{
  "taker_wallet": "...",
  "taker_is_zealy_registered": true,
  "maker_wallet": "...",
  "maker_is_zealy_registered": false,
  ...
}
```

**If flags are missing:**
- Backend code not deployed
- Need to restart backend

### 6. Frontend Not Displaying Icon
The frontend might not be rendering the icon.

**Check browser console:**
```javascript
// Open DevTools > Network tab
// Filter by "trades" or "airdrop-results"
// Check the response includes the zealy flags
```

**Check the component:**
- Verify `isZealyRegistered` prop is being passed
- Check if the condition `{isZealyRegistered && ...}` is working

## Quick Diagnostic Steps

### Step 1: Check Backend is Running
```bash
curl http://localhost:8000/api/
# Should return: {"service": "Qdoge Kennel Club API", "version": "v0.1.0"}
```

### Step 2: Check Zealy Users Exist
```bash
curl http://localhost:8000/api/zealy/users | jq '.total'
# Should return a number > 0
```

### Step 3: Manually Sync if Needed
```bash
curl -X POST http://localhost:8000/api/zealy/sync
# Should return: {"fetched": 322, "upserted": 322}
```

### Step 4: Check API Response
```bash
curl http://localhost:8000/api/epochs/197/trades | jq '.trades[0] | {taker_wallet, taker_is_zealy_registered, maker_wallet, maker_is_zealy_registered}'
```

### Step 5: Check Frontend
- Open browser DevTools
- Go to Activity page
- Select an epoch with trades
- Check Network tab for API responses
- Verify response includes `*_is_zealy_registered` fields

## Common Issues

### Issue: "total": 0 in /zealy/users
**Cause:** Zealy sync hasn't run or failed
**Fix:** 
```bash
curl -X POST http://localhost:8000/api/zealy/sync
```

### Issue: Flags always false
**Cause:** Wallet addresses in trades don't match Zealy addresses
**Fix:** Check address format and ensure users have set their wallet in Zealy

### Issue: Table doesn't exist error
**Cause:** Database not initialized with new schema
**Fix:**
```bash
docker-compose restart backend
# OR drop and recreate database (WARNING: loses data)
```

### Issue: Icon shows for wrong wallets
**Cause:** Data aggregation bug in frontend
**Fix:** Check the data flow in EpochTrades component

## Verification Checklist

- [ ] Backend is running
- [ ] `zealy_user` table exists in database
- [ ] Zealy users are synced (check `/zealy/users`)
- [ ] API returns `*_is_zealy_registered` flags
- [ ] Frontend receives the flags in API response
- [ ] Component renders the ✅ icon conditionally

## Need More Help?

1. Check backend logs: `docker-compose logs -f backend`
2. Check database: Connect to PostgreSQL and query `zealy_user` table
3. Test API endpoints manually with curl
4. Check browser console for errors
5. Verify network requests in DevTools
