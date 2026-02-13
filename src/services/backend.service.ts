import { BACKEND_API_URL } from "@/constants";

export interface Epoch {
  epoch_num: number;
  start_tick: string;
  end_tick: string | null;
  total_airdrop: string;
  is_ongoing: boolean;
}

export interface EpochsResponse {
  epochs: Epoch[];
}

export interface EpochTrade {
  trade_id: number;
  tx_hash: string;
  taker_wallet: string;
  taker_is_zealy_registered: boolean;
  maker_wallet: string;
  maker_is_zealy_registered: boolean;
  tickdate: string;
  price: string;
  quantity: string;
  type: "buy" | "sell";
  total: string;
}

export interface EpochTradesResponse {
  epoch_num: number;
  trades: EpochTrade[];
}

export interface AirdropResult {
  rank: number;
  wallet_id: string;
  is_zealy_registered: boolean;
  buy_amount: string;
  token_amount: string;
  trade_result: string;
  send_transfer_amount: string;
  total_balance: string;
  airdrop_amount: string;
}

export interface AirdropResultsResponse {
  epoch_num: number;
  threshold: string;
  results: AirdropResult[];
}

export interface AirdropPreviewResponse {
  epoch_num: number;
  total_airdrop: string;
  threshold: string;
  distributed: number;
  is_ongoing: boolean;
  preview: boolean;
  results: AirdropResult[];
}

export interface EpochTransfer {
  transfer_id: number;
  tx_hash: string;
  source: string;
  destination: string;
  issuer: string;
  asset_name: string;
  amount: string;
  tick: number;
  tickdate: string;
  money_flew: boolean;
}

export interface EpochTransfersResponse {
  epoch_num: number;
  transfers: EpochTransfer[];
}

// Fetch all epochs
export const fetchEpochs = async (): Promise<Epoch[]> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch epochs: ${response.statusText}`);
  }
  const data: EpochsResponse = await response.json();
  return data.epochs;
};

// Fetch a specific epoch
export const fetchEpoch = async (epochNum: number): Promise<Epoch> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/${epochNum}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch epoch ${epochNum}: ${response.statusText}`);
  }
  const data: Epoch = await response.json();
  return data;
};

// Fetch current epoch
export const fetchCurrentEpoch = async (): Promise<Epoch> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/current`);
  if (!response.ok) {
    throw new Error(`Failed to fetch current epoch: ${response.statusText}`);
  }
  const data: Epoch = await response.json();
  return data;
};

// Fetch trades for a specific epoch
export const fetchEpochTrades = async (epochNum: number): Promise<EpochTrade[]> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/${epochNum}/trades`);
  if (!response.ok) {
    throw new Error(`Failed to fetch trades for epoch ${epochNum}: ${response.statusText}`);
  }
  const data: EpochTradesResponse = await response.json();
  return data.trades;
};

// Fetch airdrop results for a specific epoch
export const fetchAirdropResults = async (epochNum: number): Promise<AirdropResult[]> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/${epochNum}/airdrop-results`);
  if (!response.ok) {
    throw new Error(`Failed to fetch airdrop results for epoch ${epochNum}: ${response.statusText}`);
  }
  const data: AirdropResultsResponse = await response.json();
  return data.results;
};

// Fetch airdrop preview for a specific epoch (real-time calculation)
export const fetchAirdropPreview = async (epochNum: number): Promise<AirdropPreviewResponse> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/${epochNum}/airdrop-preview`);
  if (!response.ok) {
    throw new Error(`Failed to fetch airdrop preview for epoch ${epochNum}: ${response.statusText}`);
  }
  const data: AirdropPreviewResponse = await response.json();
  return data;
};

// Fetch transfers for a specific epoch
export const fetchEpochTransfers = async (epochNum: number): Promise<EpochTransfer[]> => {
  const response = await fetch(`${BACKEND_API_URL}/epochs/${epochNum}/transfers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch transfers for epoch ${epochNum}: ${response.statusText}`);
  }
  const data: EpochTransfersResponse = await response.json();
  return data.transfers;
};

export interface UserInfo {
  wallet_id: string;
  role: "normal" | "admin";
  created_at: string;
  updated_at: string;
}

export interface RegisterUserResponse {
  success: boolean;
  wallet_id: string;
  role: "normal" | "admin";
  is_new: boolean;
}

export interface CreateWalletChangeRequestPayload {
  old_address: string;
  new_address: string;
  email: string;
  discord_handle: string;
  twitter_username: string;
}

export interface CreateWalletChangeRequestResponse {
  success: boolean;
  request_id: number;
  message: string;
}

export interface WalletChangeRequestItem {
  request_id: number;
  zealy_user_id: string;
  zealy_name: string | null;
  old_address: string;
  new_address: string;
  email: string | null;
  discord_handle: string | null;
  twitter_username: string | null;
  created_at: string;
}

export interface WalletChangeRequestListResponse {
  requests: WalletChangeRequestItem[];
}

export interface WalletChangeRequestActionResponse {
  success: boolean;
  request_id: number;
  message: string;
}

// Register user when wallet connects
export const registerUser = async (walletId: string): Promise<RegisterUserResponse> => {
  const response = await fetch(`${BACKEND_API_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet_id: walletId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to register user: ${response.statusText}`);
  }
  return response.json();
};

// Get user info including role
export const fetchUserInfo = async (walletId: string): Promise<UserInfo> => {
  const response = await fetch(`${BACKEND_API_URL}/users/${walletId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }
  return response.json();
};

export const createWalletChangeRequest = async (
  payload: CreateWalletChangeRequestPayload
): Promise<CreateWalletChangeRequestResponse> => {
  const response = await fetch(`${BACKEND_API_URL}/zealy/wallet-change-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to create wallet change request: ${response.statusText}`);
  }

  return response.json();
};

export const fetchWalletChangeRequests = async (
  apiKey: string
): Promise<WalletChangeRequestItem[]> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/zealy/wallet-change-requests`, {
    headers: {
      "X-Admin-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to fetch wallet change requests: ${response.statusText}`);
  }

  const data: WalletChangeRequestListResponse = await response.json();
  return data.requests;
};

export const approveWalletChangeRequest = async (
  requestId: number,
  apiKey: string
): Promise<WalletChangeRequestActionResponse> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/zealy/wallet-change-requests/${requestId}/approve`, {
    method: "PUT",
    headers: {
      "X-Admin-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to approve wallet change request: ${response.statusText}`);
  }

  return response.json();
};

export const rejectWalletChangeRequest = async (
  requestId: number,
  apiKey: string
): Promise<WalletChangeRequestActionResponse> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/zealy/wallet-change-requests/${requestId}/reject`, {
    method: "PUT",
    headers: {
      "X-Admin-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to reject wallet change request: ${response.statusText}`);
  }

  return response.json();
};

// Admin API call helper - set epoch total airdrop
export const setEpochTotalAirdrop = async (
  epochNum: number,
  totalAirdrop: number,
  apiKey: string
): Promise<{ success: boolean; epoch_num: number; total_airdrop: string }> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/epochs/${epochNum}/total-airdrop?total_airdrop=${totalAirdrop}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-API-Key": apiKey,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to set total airdrop: ${response.statusText}`);
  }
  return response.json();
};

// Admin API call helper - set epoch threshold
export const setEpochThreshold = async (
  epochNum: number,
  threshold: number,
  apiKey: string
): Promise<{ success: boolean; epoch_num: number; threshold: string }> => {
  const response = await fetch(`${BACKEND_API_URL}/admin/epochs/${epochNum}/threshold?threshold=${threshold}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-API-Key": apiKey,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to set threshold: ${response.statusText}`);
  }
  return response.json();
};
