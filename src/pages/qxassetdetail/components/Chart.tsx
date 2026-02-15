import LightweightChart from "@/components/LightweightChart";
import { fetchAssetChartAveragePrice } from "@/services/api.service";
import { cn } from "@/utils";
import { useAtom } from "jotai";
import type { CandlestickData, SingleValueData, Time } from "lightweight-charts";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { settingsAtom } from "@/store/settings";

type TimeFrame = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
type ChartType = "line" | "area" | "candle";


const Chart: React.FC<
  {
    className: string;
    issuer: string;
    asset: string;
    lensPrice?: number;
    selectedPrice?: number;
    showChartTypeControls?: boolean;
    showTimeFrameControls?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({ className, issuer, asset, lensPrice, selectedPrice, showChartTypeControls, showTimeFrameControls, ...props }) => {
  const [priceData, setPriceData] = useState<SingleValueData[]>([]);
  const [candleData, setCandleData] = useState<CandlestickData[]>([]);
  const [volumeData, setVolumeData] = useState<SingleValueData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [, setChartType] = useState<ChartType>("line");
  const [settings] = useAtom(settingsAtom);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchAssetChartAveragePrice(issuer, asset);

        const avgPriceData: SingleValueData[] =
          res?.map((v) => ({
            value: v.averagePrice,
            time: v.time.split("T")[0] as Time,
          })) ?? [];

        const histogramVolumeData: SingleValueData[] =
          res?.map((v) => ({
            value: v.totalAmount,
            time: v.time.split("T")[0] as Time,
          })) ?? [];

        setPriceData(avgPriceData);
        setVolumeData(histogramVolumeData);

        const candles: CandlestickData[] =
          res?.map((v, i) => {
            const prev = i > 0 ? res?.[i - 1] : undefined;
            const open = prev?.averagePrice ?? v.averagePrice;
            const close = v.averagePrice;
            const high = v.max ?? Math.max(open, close);
            const low = v.min ?? Math.min(open, close);
            return {
              time: v.time.split("T")[0] as Time,
              open,
              high,
              low,
              close,
            };
          }) ?? [];
        setCandleData(candles);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [issuer, asset]);

  const handleTimeFrameChange = (_newTimeFrame: TimeFrame) => {
    // TimeFrame selection is currently a no-op — the API does not support
    // a timeframe parameter yet.  Kept as a placeholder for future use.
  };

  const handleChartTypeChange = (newChartType: ChartType) => {
    setChartType(newChartType);
  };

  if (loading && priceData.length === 0) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center", className)} {...props}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)} {...props}>
      <LightweightChart
        priceDataSeries={priceData}
        candleDataSeries={candleData}
        volumeDataSeries={volumeData}
        className="h-full"
        title={asset}
        symbol={asset}
        loading={loading}
        showControls={false}
        showChartTypeControls={showChartTypeControls}
        showTimeFrameControls={showTimeFrameControls}
        showTooltip={true}
        theme={settings.darkMode ? "dark" : "light"}
        themeKey={`${settings.theme}:${settings.darkMode}`}
        lensPrice={lensPrice}
        selectedPrice={selectedPrice}
        onTimeFrameChange={handleTimeFrameChange}
        onChartTypeChange={handleChartTypeChange}
      />
    </div>
  );
};

export default Chart;
