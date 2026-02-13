import { motion } from "framer-motion";
import { useState } from "react";
import { ActivityType } from "../types";
import EpochTrades from "./EpochTrades";
import EpochTransfers from "./EpochTransfers";
import AirdropResults from "./AirdropResults";
import OrderbookCockpit from "./OrderbookCockpit";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { cn } from "@/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ORDERBOOK_ASSETS = ["QDOGE", "QTREAT"] as const;
type OrderbookAsset = (typeof ORDERBOOK_ASSETS)[number];

interface DisplaySectionProps {
  epoch: number;
  activity: ActivityType;
}

const DisplaySection: React.FC<DisplaySectionProps> = ({ epoch, activity }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderbookAsset, setOrderbookAsset] = useState<OrderbookAsset>("QDOGE");
  const { wallet } = useQubicConnect();
  const connectedWallet = wallet?.publicKey || null;

  const handleClearSearch = () => setSearchTerm("");

  return (
    <motion.section
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative z-0 flex flex-1 min-h-0 flex-col overflow-hidden bg-background"
    >
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="ml-7">
            {activity === "Orderbook" ? (
              <Tabs value={orderbookAsset} onValueChange={(v) => setOrderbookAsset(v as OrderbookAsset)}>
                Orderbook -
                <TabsList>
                  {ORDERBOOK_ASSETS.map((asset) => (
                    <TabsTrigger key={asset} value={asset}>
                      {asset}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <h2 className="text-sm md:text-base font-semibold text-foreground">
                {`${activity} Details`}
              </h2>
            )}
            <p className="text-xs text-muted-foreground mt-1">Epoch {epoch}</p>
          </div>
          {(activity === "Trades" || activity === "Transfers" || activity === "Airdrop") && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search wallet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          "flex-1 min-h-0 p-3 md:p-4",
          activity === "Orderbook"
            ? "overflow-hidden"
            : "overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        )}
      >
        <div className={activity === "Orderbook" ? "h-full min-h-0" : "mx-auto max-w-6xl h-full"}>
          {activity === "Orderbook" ? (
            <OrderbookCockpit key={orderbookAsset} asset={orderbookAsset} />
          ) : activity === "Trades" ? (
            <EpochTrades epoch={epoch} searchTerm={searchTerm} connectedWallet={connectedWallet} />
          ) : activity === "Transfers" ? (
            <EpochTransfers epoch={epoch} searchTerm={searchTerm} connectedWallet={connectedWallet} />
          ) : activity === "Airdrop" ? (
            <AirdropResults epoch={epoch} searchTerm={searchTerm} connectedWallet={connectedWallet} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="rounded-lg border-2 border-dashed border-border p-6 md:p-10 bg-muted/10 w-full max-w-2xl">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">{activity} Activity</h3>
                <p className="text-muted-foreground mb-2">Epoch {epoch}</p>
                <p className="text-sm text-muted-foreground">{activity} details will be displayed here</p>
                <p className="text-xs text-muted-foreground mt-3 opacity-70">Coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

export default DisplaySection;
