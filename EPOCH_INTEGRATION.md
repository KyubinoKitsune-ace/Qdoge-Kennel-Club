# Epoch Integration - Frontend & Backend

## Overview

The Activity page now fetches epoch data from the backend database and displays it dynamically.

## Backend API Endpoints

### 1. Get All Epochs
```
GET /api/epochs
```

**Response:**
```json
{
  "epochs": [
    {
      "epoch_num": 197,
      "start_tick": "2026-01-21T12:00:00+00:00",
      "end_tick": null,
      "total_airdrop": "0",
      "is_ongoing": true
    }
  ]
}
```

### 2. Get Specific Epoch
```
GET /api/epochs/{epoch_num}
```

**Response:**
```json
{
  "epoch_num": 197,
  "start_tick": "2026-01-21T12:00:00+00:00",
  "end_tick": null,
  "total_airdrop": "0",
  "is_ongoing": true
}
```

### 3. Get Current Epoch
```
GET /api/epochs/current
```

**Response:** Same as specific epoch

## Frontend Integration

### 1. New Service (`src/services/backend.service.ts`)

```typescript
import { BACKEND_API_URL } from "@/constants";

export interface Epoch {
  epoch_num: number;
  start_tick: string;
  end_tick: string | null;
  total_airdrop: string;
  is_ongoing: boolean;
}

// Fetch all epochs
export const fetchEpochs = async (): Promise<Epoch[]>

// Fetch specific epoch
export const fetchEpoch = async (epochNum: number): Promise<Epoch>

// Fetch current epoch
export const fetchCurrentEpoch = async (): Promise<Epoch>
```

### 2. Updated Activity Page (`src/pages/activity/index.tsx`)

**Changes:**
- Fetches epochs from backend on component mount
- Displays loading state while fetching
- Uses backend epochs if available, falls back to generated list
- Shows epochs starting from epoch 197 (as configured)

**Flow:**
```
Component Mount
    ↓
Fetch epochs from backend
    ↓
Display epochs in EpochSelectionSection
    ↓
User selects epoch
    ↓
Show activities for that epoch
```

### 3. Configuration (`src/constants.ts`)

```typescript
export const BACKEND_API_URL = 
  import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000/api";
```

## Environment Variables

### Frontend (`.env`)
```bash
VITE_BACKEND_API_URL=http://localhost:8000/api
```

### Production
```bash
VITE_BACKEND_API_URL=https://your-domain.com/api
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Backend                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Background Task (every hour)                           │
│  ├─ Calculate current epoch                             │
│  ├─ Create/update epoch in database                     │
│  └─ Set end_tick when epoch finishes                    │
│                                                          │
│  Database (PostgreSQL)                                  │
│  ├─ epoch table                                         │
│  │   ├─ epoch_num: 197                                  │
│  │   ├─ start_tick: 2026-01-21 12:00 UTC               │
│  │   ├─ end_tick: NULL (ongoing)                        │
│  │   └─ total_airdrop: 0                                │
│                                                          │
│  API Endpoints                                          │
│  ├─ GET /api/epochs                                     │
│  ├─ GET /api/epochs/{epoch_num}                         │
│  └─ GET /api/epochs/current                             │
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
│  └─ fetchEpochs() → GET /api/epochs                     │
│                                                          │
│  Activity Page                                          │
│  ├─ useEffect: fetch epochs on mount                    │
│  ├─ Display loading state                               │
│  ├─ Store epochs in state                               │
│  └─ Render EpochSelectionSection                        │
│                                                          │
│  User sees:                                             │
│  ├─ Epoch 197 (Ongoing) ← from database                 │
│  ├─ Epoch 196 (Finished)                                │
│  └─ ...                                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Benefits

✅ **Real-time data**: Epochs come from database, not hardcoded
✅ **Automatic updates**: Backend syncs epochs every hour
✅ **Ongoing status**: `end_tick = NULL` clearly shows active epochs
✅ **Fallback**: If backend is unavailable, generates epochs starting from 197
✅ **Type-safe**: TypeScript interfaces for all epoch data
✅ **Loading states**: Shows loading indicator while fetching

## Testing

### 1. Start Backend
```bash
cd backend
uvicorn app.main:app --reload
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Visit Activity Page
```
http://localhost:5173/activity
```

### 4. Check Console
- Should see "Loading epochs..."
- Then epochs fetched from backend
- Epoch 197 should be marked as ongoing

### 5. Check Backend Logs
```
[Background] Syncing epochs...
[Background] Epoch sync completed: {'current_epoch': 197, ...}
```

## API Testing

```bash
# Get all epochs
curl http://localhost:8000/api/epochs

# Get specific epoch
curl http://localhost:8000/api/epochs/197

# Get current epoch
curl http://localhost:8000/api/epochs/current
```
