import { motion } from "framer-motion";
import { ActivityType } from "../types";
import EpochTrades from "./EpochTrades";

interface DisplaySectionProps {
  epoch: number;
  activity: ActivityType;
}

const DisplaySection: React.FC<DisplaySectionProps> = ({ epoch, activity }) => {
  return (
    <motion.section
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.3 }
      }}
      className="flex flex-1 flex-col bg-background overflow-hidden relative z-0"
    >
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {activity} Details
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Epoch {epoch}
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="mx-auto max-w-6xl h-full">
          {activity === "Trade" ? (
            <EpochTrades epoch={epoch} />
          ) : (
            /* Placeholder for other activities */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="rounded-lg border-2 border-dashed border-border p-12 bg-muted/10 w-full max-w-2xl">
                <h3 className="text-2xl font-semibold text-foreground mb-3">
                  {activity} Activity
                </h3>
                <p className="text-muted-foreground mb-2 text-lg">
                  Epoch {epoch}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity} details will be displayed here
                </p>
                <p className="text-xs text-muted-foreground mt-4 opacity-70">
                  This section is ready for future implementation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};

export default DisplaySection;
