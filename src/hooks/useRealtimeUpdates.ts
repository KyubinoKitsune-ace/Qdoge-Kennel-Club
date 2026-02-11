import { useEffect } from "react";
import { useAtom } from "jotai";
import { useSocketIO } from "./useSocketIO";
import { tradesAtom } from "@/store/trades";
import { refetchAtom } from "@/store/action";
import { fetchTrades } from "@/services/api.service";
import { BACKEND_API_URL } from "@/constants";

/**
 * Listens for real-time Socket.IO events from the backend and
 * refreshes the relevant jotai atoms so the UI stays in sync
 * without polling.
 *
 * Events handled:
 *   - trades_updated    → refetch trades
 *   - transfers_updated → trigger global refetch (assets + balances)
 *   - epoch_synced      → trigger global refetch
 */
export function useRealtimeUpdates() {
  const socketUrl = BACKEND_API_URL.replace("/api", "") || window.location.origin;

  const { isConnected, on } = useSocketIO({
    url: socketUrl,
    autoConnect: true,
  });

  const [, setTrades] = useAtom(tradesAtom);
  const [, setRefetch] = useAtom(refetchAtom);

  useEffect(() => {
    if (!isConnected) return;

    const unsubTrades = on("trades_updated", async () => {
      console.log("[Realtime] trades_updated — refetching trades");
      const trades = await fetchTrades();
      setTrades(trades);
    });

    const unsubTransfers = on("transfers_updated", () => {
      console.log("[Realtime] transfers_updated — triggering refetch");
      setRefetch((prev) => !prev);
    });

    const unsubEpoch = on("epoch_synced", () => {
      console.log("[Realtime] epoch_synced — triggering refetch");
      setRefetch((prev) => !prev);
    });

    return () => {
      unsubTrades();
      unsubTransfers();
      unsubEpoch();
    };
  }, [isConnected, on, setTrades, setRefetch]);

  return { isConnected };
}
