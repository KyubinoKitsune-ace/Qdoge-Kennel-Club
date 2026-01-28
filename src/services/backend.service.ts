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
  maker_wallet: string;
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
