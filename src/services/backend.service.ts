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
  airdrop_amount: string;
}

export interface AirdropResultsResponse {
  epoch_num: number;
  results: AirdropResult[];
}

export interface AirdropPreviewResponse {
  epoch_num: number;
  total_airdrop: string;
  distributed: number;
  is_ongoing: boolean;
  preview: boolean;
  results: AirdropResult[];
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
