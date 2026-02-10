import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { tickInfoAtom } from "@/store/tickInfo";
import { latestStatsAtom } from "@/store/latestStats";
import { balancesAtom } from "@/store/balances";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { fetchBalance, fetchLatestStats, fetchTickInfo } from "@/services/rpc.service";

const useRPCFetcher = () => {
  const intervalRef = useRef<NodeJS.Timeout>();
  const [tickInfo, setTickInfo] = useAtom(tickInfoAtom);
  const epoch = useRef<number>(tickInfo?.epoch);
  const [, setLatestStats] = useAtom(latestStatsAtom);
  const [, setBalance] = useAtom(balancesAtom);
  const { wallet } = useQubicConnect();

  // Fetch tick info every 10 seconds
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const data = await fetchTickInfo();
      if (data && data?.tick) {
        setTickInfo(data);
        epoch.current = data.epoch;
      }
    }, 10000);

    return () => clearInterval(intervalRef.current!);
  }, [setTickInfo]);

  // Fetch latest stats once on mount
  useEffect(() => {
    fetchLatestStats().then(setLatestStats);
  }, [setLatestStats]);

  // Fetch wallet balance when wallet changes
  useEffect(() => {
    const setUserAccount = async () => {
      if (wallet) {
        const balance = await fetchBalance(wallet.publicKey);
        setBalance([balance]);
      }
    };
    setUserAccount();
  }, [wallet, setBalance]);

};

export default useRPCFetcher;
