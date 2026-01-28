import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchEpochTrades, type EpochTrade } from "@/services/backend.service";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { EXPLORER_URL } from "@/constants";
import { cn } from "@/utils";

interface EpochTradesProps {
  epoch: number;
}

const EpochTrades: React.FC<EpochTradesProps> = ({ epoch }) => {
  const [trades, setTrades] = useState<EpochTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTrades = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetchEpochTrades(epoch);
        setTrades(res);
      } catch (err) {
        console.error("Failed to fetch epoch trades:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch trades");
      } finally {
        setIsLoading(false);
      }
    };
    getTrades();
  }, [epoch]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="flex items-center justify-center">
        <p className="text-xl font-bold">Epoch {epoch} Trades</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden border border-border/60 bg-card/70 p-2 shadow-inner shadow-black/5 dark:shadow-black/40">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading trades...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No trades found for this epoch</p>
          </div>
        ) : (
          <ScrollArea
            type="hover"
            scrollHideDelay={200}
            className="h-full max-h-full"
          >
            <div className="pr-1">
              <Table
                wrapperClassName="h-full min-h-0 !overflow-visible"
                className="table-auto [&_td]:whitespace-nowrap [&_td]:text-center [&_th]:text-center"
              >
                <TableHeader className="text-xs sticky top-0 z-20 border-b border-border/60 bg-card/90 backdrop-blur-sm [&_th]:sticky [&_th]:top-0 [&_th]:bg-card/90 [&_th]:text-card-foreground [&_th]:shadow-sm">
                  <TableRow>
                    <TableHead>Side</TableHead>
                    <TableHead>Price (Qu)</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total (Qu)</TableHead>
                    <TableHead>TxID</TableHead>
                    <TableHead>Taker</TableHead>
                    <TableHead>Maker</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40 text-muted-foreground text-xs">
                  {trades.map((trade) => (
                    <TableRow key={trade.trade_id}>
                      <TableCell className={cn(trade.type === "buy" ? "text-green-500" : "text-red-500")}>
                        {trade.type === "buy" ? "Buy" : "Sell"}
                      </TableCell>
                      <TableCell className="!text-right">
                        {Number(trade.price).toLocaleString()}
                      </TableCell>
                      <TableCell className="!text-right">
                        {Number(trade.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="!text-right">
                        {Number(trade.total).toLocaleString()}
                      </TableCell>
                      <TableCell className="truncate">
                        <Link
                          to={`${EXPLORER_URL}/network/tx/${trade.tx_hash}`}
                          target="_blank"
                          className="text-primary hover:text-primary/70"
                        >
                          {trade.tx_hash.slice(0, 5)}...{trade.tx_hash.slice(-5)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/entity/${trade.taker_wallet}`}
                          className="text-primary hover:text-primary/70"
                        >
                          {trade.taker_wallet.slice(0, 5)}...{trade.taker_wallet.slice(-5)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/entity/${trade.maker_wallet}`}
                          className="text-primary hover:text-primary/70"
                        >
                          {trade.maker_wallet.slice(0, 5)}...{trade.maker_wallet.slice(-5)}
                        </Link>
                      </TableCell>
                      <TableCell>{new Date(trade.tickdate).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default EpochTrades;
