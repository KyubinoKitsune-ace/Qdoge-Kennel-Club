import { motion } from "framer-motion";
import { ActivityType } from "../types";
import EpochTrades from "./EpochTrades";
import AirdropResults from "./AirdropResults";

interface DisplaySectionProps {
  epoch: number;
  activity: ActivityType;
}

const DisplaySection: React.FC<DisplaySectionProps> = ({ epoch, activity }) => (
  <motion.section
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 50 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    className="flex flex-1 flex-col bg-background overflow-hidden relative z-0"
  >
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <h2 className="text-sm md:text-base font-semibold text-foreground">{activity} Details</h2>
      <p className="text-xs text-muted-foreground">Epoch {epoch}</p>
    </div>
    <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div className="mx-auto max-w-6xl h-full">
        {activity === "Trade" ? (
          <EpochTrades epoch={epoch} />
        ) : activity === "Airdrop" ? (
          <AirdropResults epoch={epoch} />
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

export default DisplaySection;
