import { useState, useMemo, useEffect } from "react";
import { useAtom } from "jotai";
import { tickInfoAtom } from "@/store/tickInfo";
import { AnimatePresence } from "framer-motion";
import EpochSelectionSection from "./components/EpochSelectionSection";
import ActivitySelectionSection from "./components/ActivitySelectionSection";
import DisplaySection from "./components/DisplaySection";
import { ActivityType } from "./types";
import { fetchEpochs, type Epoch } from "@/services/backend.service";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

const Activity: React.FC = () => {
  const { connected, toggleConnectModal } = useQubicConnect();
  const [tickInfo] = useAtom(tickInfoAtom);
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [expandedEpochs, setExpandedEpochs] = useState<Set<number>>(new Set());
  const [backendEpochs, setBackendEpochs] = useState<Epoch[]>([]);
  const [isLoadingEpochs, setIsLoadingEpochs] = useState(true);

  useEffect(() => {
    const loadEpochs = async () => {
      try {
        setIsLoadingEpochs(true);
        const epochs = await fetchEpochs();
        setBackendEpochs(epochs);
      } catch (error) {
        console.error("Failed to fetch epochs:", error);
      } finally {
        setIsLoadingEpochs(false);
      }
    };
    loadEpochs();
  }, []);

  const currentEpoch = useMemo(() => {
    if (backendEpochs.length > 0) {
      const ongoing = backendEpochs.find(e => e.is_ongoing);
      return ongoing?.epoch_num || backendEpochs[0]?.epoch_num || 197;
    }
    return tickInfo?.epoch || 197;
  }, [backendEpochs, tickInfo]);
  
  const epochs = useMemo(() => {
    if (backendEpochs.length > 0) {
      return backendEpochs.map(e => e.epoch_num).sort((a, b) => b - a);
    }
    const epochList: number[] = [];
    for (let i = currentEpoch; i >= 197; i--) epochList.push(i);
    return epochList;
  }, [backendEpochs, currentEpoch]);

  const handleEpochSelect = (epoch: number) => {
    if (selectedEpoch === epoch) {
      setExpandedEpochs(new Set());
      setSelectedEpoch(null);
      setSelectedActivity(null);
    } else {
      setExpandedEpochs(new Set([epoch]));
      setSelectedEpoch(epoch);
      setSelectedActivity(null);
    }
  };

  const handleActivitySelect = (activity: ActivityType) => setSelectedActivity(activity);

  if (isLoadingEpochs) {
    return (
      <main className="relative isolate flex min-h-[calc(100vh-140px)] w-full bg-background overflow-hidden">
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-muted-foreground">Loading epochs...</p>
        </div>
      </main>
    );
  }

  // Require wallet connection to view activity page
  if (!connected) {
    return (
      <main className="relative isolate flex min-h-[calc(100vh-140px)] w-full bg-background overflow-hidden">
        <div className="flex flex-col items-center justify-center w-full h-full gap-4">
          <Wallet className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please connect your wallet to view activity data and track your trades and transfers.
          </p>
          <Button onClick={toggleConnectModal} className="mt-2">
            Connect Wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate flex h-[calc(100vh-140px)] w-full flex-col overflow-hidden bg-background md:flex-row">
      <EpochSelectionSection
        epochs={epochs}
        selectedEpoch={selectedEpoch}
        expandedEpochs={expandedEpochs}
        onEpochSelect={handleEpochSelect}
      />
      <AnimatePresence mode="wait">
        {selectedEpoch && (
          <ActivitySelectionSection
            key={selectedEpoch}
            epoch={selectedEpoch}
            selectedActivity={selectedActivity}
            onActivitySelect={handleActivitySelect}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {selectedActivity && selectedEpoch && (
          <DisplaySection
            key={`${selectedEpoch}-${selectedActivity}`}
            epoch={selectedEpoch}
            activity={selectedActivity}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default Activity;
