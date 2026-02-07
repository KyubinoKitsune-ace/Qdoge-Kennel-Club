import { motion } from "framer-motion";
import { ActivityType } from "../types";
import { cn } from "@/utils";

interface ActivitySelectionSectionProps {
  epoch: number;
  selectedActivity: ActivityType | null;
  onActivitySelect: (activity: ActivityType) => void;
}

const ACTIVITY_TYPES: ActivityType[] = ["Orderbook", "Trades", "Transfers", "Airdrop","QTREATS","NFTS"];

const ActivitySelectionSection: React.FC<ActivitySelectionSectionProps> = ({
  epoch, selectedActivity, onActivitySelect,
}) => (
  <motion.section
    initial={{ opacity: 0, x: -50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    className="flex w-full md:w-[200px] md:min-w-[200px] lg:w-[280px] lg:min-w-[280px] flex-col border-b md:border-b-0 md:border-r border-border bg-card overflow-hidden h-auto md:h-full relative z-5"
  >
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Activity</h2>
    </div>
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div className="flex flex-row md:flex-col gap-2 p-3 overflow-x-auto md:overflow-x-visible">
        {ACTIVITY_TYPES.map((activity) => {
          const isSelected = selectedActivity === activity;
          return (
            <motion.button
              key={activity}
              onClick={() => onActivitySelect(activity)}
              className={cn(
                "group relative flex items-center justify-center rounded-md px-4 py-4 md:py-6 text-center transition-all duration-200 min-w-[100px] md:min-w-0 md:min-h-[80px]",
                "hover:bg-muted/30",
                isSelected
                  ? "bg-muted/20 text-foreground border-2 border-primary shadow-sm"
                  : "text-foreground border border-border md:border-2 hover:border-primary/50"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute left-0 top-0 z-10 overflow-hidden">
                <div className="relative w-[28px] h-[28px] md:w-[32px] md:h-[32px]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}>
                  <div className="absolute inset-0 bg-primary" />
                  <span className="absolute left-[3px] top-[2px] text-[8px] md:text-[9px] font-bold text-primary-foreground">{epoch}</span>
                </div>
              </div>
              <span className="text-xs md:text-sm font-semibold uppercase tracking-wider">{activity}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  </motion.section>
);

export default ActivitySelectionSection;
