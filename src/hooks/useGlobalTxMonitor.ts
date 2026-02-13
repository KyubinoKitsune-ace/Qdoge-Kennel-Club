import { toast } from "react-hot-toast";
import { useAtom } from "jotai";
import { useEffect } from "react";

import { monitoringTasksAtom, useTxMonitor } from "@/store/txMonitor";
import { tickInfoAtom } from "@/store/tickInfo";

const useGlobalTxMonitor = () => {
  const [tickInfo] = useAtom(tickInfoAtom);
  const [monitoringTasks] = useAtom(monitoringTasksAtom);
  const { isMonitoring, stopMonitoring } = useTxMonitor();

  useEffect(() => {
    if (!isMonitoring) return;
    const currentTick = tickInfo?.tick;

    Object.entries(monitoringTasks).forEach(([taskId, task]) => {
      const { checker, onSuccess, onFailure } = task;

      const TIMEOUT_TICKS = 10;
      if (currentTick > task.targetTick + TIMEOUT_TICKS) {
        onFailure();
        stopMonitoring(taskId);
        return;
      }

      if (currentTick > task.targetTick) {
        checker().then((success) => {
          if (success) {
            onSuccess();
            stopMonitoring(taskId);
          }
        });
      }
    });
  }, [tickInfo, isMonitoring, monitoringTasks, stopMonitoring]);

  useEffect(() => {
    if (!isMonitoring) return;
    const toastId = toast.loading("Monitoring transaction...", {
      position: "bottom-right",
    });
    return () => toast.dismiss(toastId);
  }, [isMonitoring]);

  return null;
};

export default useGlobalTxMonitor;
