# Epoch Trades Integration

## Overview

The Activity page now displays trades for each epoch, fetched from the backend database and displayed in a format similar to AssetTrades.

## Backend API

### New Endpoint: Get Epoch Trades

```
GET /api/epochs/{epoch_num}/trades
```

**Response:**
```json
{
  "epoch_num": 197,
  "trades": [
    {
      "trade_id": 1,
      "tx_hash": "abc123...",
      "taker_wallet": "WALLET1...",
      "maker_wallet": "WALLET2...",
      "tickdate": "2026-01-27T22:24:00+00:00",
      "price": "1000",
      "quantity": "500",
      "type": "buy",
      "total": "500000"
    }
  ]
}
```

**Logic:**
- Fetches all trades where `tickdate >= epoch.start_tick`
- If epoch has ended, also filters `tickdate < epoch.end_tick`
- Orders by `tickdate DESC` (newest first)
- Returns empty array if no trades found

## Frontend Components

### 1. New Component: `EpochTrades.tsx`

Located: `src/pages/activity/components/EpochTrades.tsx`

**Features:**
- Fetches trades for a specific epoch
- Displays loading state while fetching
- Shows error message if fetch fails
- Displays "No trades found" if epoch has no trades
- Table format similar to `AssetTrades.tsx`

**Columns:**
- Side (Buy/Sell) - color coded (green/red)
- Price (Qu) - right aligned
- Quantity - right aligned
- Total (Qu) - right aligned
- TxID - truncated with link to explorer
- Taker - truncated with link to entity page
- Maker - truncated with link to entity page
- Date & Time - formatted locale string

### 2. Updated: `DisplaySection.tsx`

**Changes:**
- Imports `EpochTrades` component
- Shows `EpochTrades` when activity type is "Trade"
- Keeps placeholder for "Transfer" and "Airdrop" activities

**Flow:**
```typescript
if (activity === "Trade") {
  return <EpochTrades epoch={epoch} />
} else {
  return <Placeholder />
}
```

### 3. Updated: `backend.service.ts`

**New Types:**
```typescript
export interface EpochTrade {
  trade_id: number;
  tx_hash: string;
  taker_wallet: string;
  maker_wallet: string;
  tickdate: string;
  price: string;
  quantity: string;
  type: "buy" | "sell";
  total: string;
}
```

**New Function:**
```typescript
export const fetchEpochTrades = async (epochNum: number): Promise<EpochTrade[]>
```

## User Flow

```
1. User visits Activity page
   ↓
2. Selects an epoch (e.g., Epoch 197)
   ↓
3. Selects "Trade" activity
   ↓
4. DisplaySection shows EpochTrades component
   ↓
5. EpochTrades fetches trades from backend
   ↓
6. Displays trades in table format
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Backend                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Database Query:                                        │
│  SELECT * FROM trade                                    │
│  WHERE tickdate >= epoch.start_tick                     │
│    AND tickdate < epoch.end_tick (if ended)             │
│  ORDER BY tickdate DESC                                 │
│                                                          │
│  API Endpoint:                                          │
│  GET /api/epochs/197/trades                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
                    HTTP Request
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  backend.service.ts                                     │
│  └─ fetchEpochTrades(197)                               │
│                                                          │
│  EpochTrades Component                                  │
│  ├─ useEffect: fetch trades on mount                    │
│  ├─ Display loading state                               │
│  ├─ Store trades in state                               │
│  └─ Render table with trades                            │
│                                                          │
│  User sees:                                             │
│  ┌─────────────────────────────────────────┐           │
│  │ Side │ Price │ Quantity │ Total │ ...   │           │
│  ├─────────────────────────────────────────┤           │
│  │ Buy  │ 1,000 │ 500      │ 500,000│ ...  │           │
│  │ Sell │ 950   │ 300      │ 285,000│ ...  │           │
│  └─────────────────────────────────────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Ongoing Epoch with Trades
- Epoch 197 is ongoing (end_tick = NULL)
- Has 150 trades
- Query: `WHERE tickdate >= '2026-01-21 12:00:00'`
- Result: Shows all 150 trades

### Scenario 2: Finished Epoch with Trades
- Epoch 196 is finished
- Has 500 trades
- Query: `WHERE tickdate >= '2026-01-14 12:00:00' AND tickdate < '2026-01-21 12:00:00'`
- Result: Shows all 500 trades from that week

### Scenario 3: Epoch with No Trades
- Epoch 195 has no trades
- Query returns empty array
- Result: Shows "No trades found for this epoch"

## Testing

### 1. Backend API Test
```bash
# Get trades for epoch 197
curl http://localhost:8000/api/epochs/197/trades
```

### 2. Frontend Test
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Visit: `http://localhost:5173/activity`
4. Select an epoch
5. Click "Trade" activity
6. Should see trades table

### 3. Expected Behavior
- Loading state appears briefly
- Trades table loads with data
- Clicking TxID opens explorer in new tab
- Clicking wallet addresses navigates to entity page
- Buy orders show in green, Sell orders in red
- Numbers are formatted with commas

## Benefits

✅ **Real-time data**: Trades come from database, not API
✅ **Epoch filtering**: Only shows trades for selected epoch
✅ **Familiar UI**: Same format as AssetTrades component
✅ **Loading states**: Shows loading/error/empty states
✅ **Interactive**: Links to explorer and entity pages
✅ **Type-safe**: TypeScript interfaces for all data
✅ **Scalable**: Easy to add Transfer and Airdrop views

## Next Steps

To add other activity types:

1. **Transfer Activity**:
   - Create `GET /api/epochs/{epoch_num}/transfers` endpoint
   - Create `EpochTransfers.tsx` component
   - Add to DisplaySection

2. **Airdrop Activity**:
   - Create `GET /api/epochs/{epoch_num}/airdrops` endpoint
   - Create `EpochAirdrops.tsx` component
   - Add to DisplaySection
