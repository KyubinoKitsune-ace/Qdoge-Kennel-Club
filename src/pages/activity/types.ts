export type ActivityType = "Trades" | "Transfers" | "Airdrop" | "QTREATS" | "NFTS";

export interface ActivityData {
  epoch: number;
  activity: ActivityType;
  items: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  [key: string]: any; // Extensible for different activity types
}
