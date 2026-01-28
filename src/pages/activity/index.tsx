import { useState, useMemo, useEffect } from "react";
import { useAtom } from "jotai";
import { tickInfoAtom } from "@/store/tickInfo";
import { AnimatePresence } from "framer-motion";
import EpochSelectionSection from "./components/EpochSelectionSection";
import ActivitySelectionSection from "./components/ActivitySelectionSection";
import DisplaySection from "./components/DisplaySection";
import { ActivityType } from "./types";
import { fetchEpochs, type Epoch } from "@/services/backend.service";

const Activity: React.FC = () => {
  const [tickInfo] = useAtom(tickInfoAtom);
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [expandedEpochs, setExpandedEpochs] = useState<Set<number>>(new Set());
  const [backendEpochs, setBackendEpochs] = useState<Epoch[]>([]);
  const [isLoadingEpochs, setIsLoadingEpochs] = useState(true);

  // Fetch epochs from backend
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

  // Get current epoch from backend or fallback to tickInfo
  const currentEpoch = useMemo(() => {
    if (backendEpochs.length > 0) {
      const ongoing = backendEpochs.find(e => e.is_ongoing);
      return ongoing?.epoch_num || backendEpochs[0]?.epoch_num || 197;
    }
    return tickInfo?.epoch || 197;
  }, [backendEpochs, tickInfo]);
  
  // Generate list of epochs from backend or fallback to generated list
  const epochs = useMemo(() => {
    if (backendEpochs.length > 0) {
      return backendEpochs.map(e => e.epoch_num).sort((a, b) => b - a);
    }
    
    // Fallback: generate list starting from epoch 197
    const epochList: number[] = [];
    const startEpoch = 197;
    for (let i = currentEpoch; i >= startEpoch; i--) {
      epochList.push(i);
    }
    return epochList;
  }, [backendEpochs, currentEpoch]);

  // Handle epoch selection - only one epoch can be expanded at a time
  const handleEpochSelect = (epoch: number) => {
    if (selectedEpoch === epoch) {
      // If clicking on the already selected epoch, collapse it
      setExpandedEpochs(new Set());
      setSelectedEpoch(null);
      setSelectedActivity(null);
    } else {
      // Select new epoch - collapse previous one and expand new one
      setExpandedEpochs(new Set([epoch]));
      setSelectedEpoch(epoch);
      setSelectedActivity(null); // Reset activity when epoch changes
    }
  };

  // Handle activity selection
  const handleActivitySelect = (activity: ActivityType) => {
    setSelectedActivity(activity);
  };

  if (isLoadingEpochs) {
    return (
      <main className="relative isolate flex min-h-[calc(100vh-140px)] w-full bg-background overflow-hidden">
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-muted-foreground">Loading epochs...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate flex min-h-[calc(100vh-140px)] w-full bg-background overflow-hidden">
      <div className="flex w-full h-full">
        {/* Section 1: Epoch Selection */}
        <EpochSelectionSection
          epochs={epochs}
          selectedEpoch={selectedEpoch}
          expandedEpochs={expandedEpochs}
          onEpochSelect={handleEpochSelect}
        />

        {/* Section 2: Activity Selection */}
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

        {/* Section 3: Display Section */}
        <AnimatePresence mode="wait">
          {selectedActivity && selectedEpoch && (
            <DisplaySection
              key={`${selectedEpoch}-${selectedActivity}`}
              epoch={selectedEpoch}
              activity={selectedActivity}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Activity;
