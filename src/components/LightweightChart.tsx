import { cn, getCssVariableAsRgb } from "@/utils";
import type {
  CandlestickData,
  ChartOptions,
  DeepPartial,
  IChartApi,
  ISeriesApi,
  SingleValueData,
  SolidColor,
} from "lightweight-charts";
import { createChart, HistogramSeries, LineSeries, AreaSeries, CandlestickSeries, CrosshairMode, PriceScaleMode } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LineChart, BarChart2, CandlestickChart } from "lucide-react";
import { formatQubicAmount } from "@/utils";

type ChartType = "candle" | "line" | "area";
type TimeFrame = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

type Props = Readonly<{
  priceDataSeries: SingleValueData[];
  candleDataSeries?: CandlestickData[];
  volumeDataSeries: SingleValueData[];
  className?: string;
  title?: string;
  symbol?: string;
  loading?: boolean;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
  onChartTypeChange?: (chartType: ChartType) => void;
  showControls?: boolean;
  showTimeFrameControls?: boolean;
  showChartTypeControls?: boolean;
  showTooltip?: boolean;
  theme?: "dark" | "light";
  themeKey?: string;
  lensPrice?: number;
  selectedPrice?: number;
  HeaderComponent?: React.ReactElement;
}>;

// Chart type icon mapping
const chartTypeIcons = {
  line: <LineChart size={16} />,
  area: <BarChart2 size={16} />,
  candle: <CandlestickChart size={16} />,
};

export default function LightweightChart({
  priceDataSeries,
  candleDataSeries,
  volumeDataSeries,
  className,
  title = "Price Chart",
  symbol = "QCAP",
  loading = false,
  onTimeFrameChange,
  onChartTypeChange,
  showControls = true,
  showTimeFrameControls = showControls,
  showChartTypeControls = showControls,
  showTooltip = true,
  theme = "dark",
  themeKey,
  lensPrice,
  selectedPrice,
  HeaderComponent,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<"Line"> | ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null>(null);
  const glowSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lensLineRef = useRef<ReturnType<ISeriesApi<"Line">["createPriceLine"]> | null>(null);
  const selectedLineRef = useRef<ReturnType<ISeriesApi<"Line">["createPriceLine"]> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("1h");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("line");
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

  const effectiveThemeKey = themeKey ?? theme;

  const chartTheme = useMemo(() => {
    // Always derive from CSS variables so theme switching repaints the chart.
    const backgroundColor = getCssVariableAsRgb("--ob-chart-bg");
    const textColor = getCssVariableAsRgb("--ob-chart-axis");
    const gridColor = getCssVariableAsRgb("--ob-chart-grid");
    const crosshairColor = getCssVariableAsRgb("--ob-chart-crosshair");
    const crosshairLabelBg = getCssVariableAsRgb("--ob-chart-crosshair-label-bg");
    const seriesPrimary = getCssVariableAsRgb("--ob-chart-series-primary");
    const seriesSecondary = getCssVariableAsRgb("--ob-chart-series-secondary");
    const lensLineColor = getCssVariableAsRgb("--ob-chart-lens-line");
    const candleUp = getCssVariableAsRgb("--ob-chart-candle-up");
    const candleDown = getCssVariableAsRgb("--ob-chart-candle-down");
    const candleWickUp = getCssVariableAsRgb("--ob-chart-candle-wick-up");
    const candleWickDown = getCssVariableAsRgb("--ob-chart-candle-wick-down");

    return {
      backgroundColor,
      textColor,
      gridColor,
      crosshairColor,
      crosshairLabelBg,
      seriesPrimary,
      seriesSecondary,
      lensLineColor,
      candleUp,
      candleDown,
      candleWickUp,
      candleWickDown,
    };
  }, [effectiveThemeKey]);

  const withAlpha = (hex: string, alpha: number) => {
    const h = hex.replace("#", "").trim();
    const normalized = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const recreatePriceSeries = () => {
    if (!chartRef.current) return;

    // Remove any existing marker lines before series teardown.
    if (priceSeriesRef.current) {
      if (lensLineRef.current) {
        (priceSeriesRef.current as any).removePriceLine(lensLineRef.current);
        lensLineRef.current = null;
      }
      if (selectedLineRef.current) {
        (priceSeriesRef.current as any).removePriceLine(selectedLineRef.current);
        selectedLineRef.current = null;
      }
    }

    if (glowSeriesRef.current) {
      chartRef.current.removeSeries(glowSeriesRef.current);
      glowSeriesRef.current = null;
    }
    if (priceSeriesRef.current) {
      chartRef.current.removeSeries(priceSeriesRef.current);
      priceSeriesRef.current = null;
    }

    if (selectedChartType === "line") {
      // "Cool" glow line behind the main line.
      const glow = chartRef.current.addSeries(LineSeries);
      glow.applyOptions({
        lineWidth: 4,
        color: withAlpha(chartTheme.seriesPrimary, 0.18),
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      glowSeriesRef.current = glow;

      const main = chartRef.current.addSeries(LineSeries);
      main.applyOptions({
        lineWidth: 2,
        color: chartTheme.seriesPrimary,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: chartTheme.seriesPrimary,
        priceLineStyle: 2,
      });
      main.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.2 },
        mode: PriceScaleMode.Normal,
      });
      priceSeriesRef.current = main;

      glow.setData(priceDataSeries);
      main.setData(priceDataSeries);
    } else if (selectedChartType === "area") {
      const glow = chartRef.current.addSeries(LineSeries);
      glow.applyOptions({
        lineWidth: 4,
        color: withAlpha(chartTheme.seriesPrimary, 0.16),
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      glowSeriesRef.current = glow;

      const area = chartRef.current.addSeries(AreaSeries);
      area.applyOptions({
        lineWidth: 2,
        lineColor: chartTheme.seriesPrimary,
        topColor: withAlpha(chartTheme.seriesPrimary, 0.20),
        bottomColor: withAlpha(chartTheme.seriesPrimary, 0.02),
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
        lastValueVisible: true,
        priceLineVisible: true,
      });
      area.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.2 },
        mode: PriceScaleMode.Normal,
      });
      priceSeriesRef.current = area;

      glow.setData(priceDataSeries);
      area.setData(priceDataSeries);
    } else {
      const candle = chartRef.current.addSeries(CandlestickSeries);
      candle.applyOptions({
        upColor: chartTheme.candleUp,
        downColor: chartTheme.candleDown,
        wickUpColor: chartTheme.candleWickUp,
        wickDownColor: chartTheme.candleWickDown,
        borderUpColor: chartTheme.candleUp,
        borderDownColor: chartTheme.candleDown,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      });
      candle.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.2 },
        mode: PriceScaleMode.Normal,
      });
      priceSeriesRef.current = candle;
      candle.setData(candleDataSeries ?? []);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) return;

    const container = chartContainerRef.current;
    const parentElement = container.parentElement;

    const width = parentElement?.offsetWidth || container.offsetWidth;
    const height = parentElement?.offsetHeight || container.offsetHeight;

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: {
        textColor: chartTheme.textColor,
        attributionLogo: false,
        background: { type: "solid", color: chartTheme.backgroundColor } as SolidColor,
      },
      rightPriceScale: { visible: true, borderVisible: false },
      leftPriceScale: { visible: true, borderVisible: false },
      grid: {
        vertLines: { color: chartTheme.gridColor, style: 1, visible: true },
        horzLines: { color: chartTheme.gridColor, style: 1, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: chartTheme.crosshairColor,
          style: 1,
          labelBackgroundColor: chartTheme.crosshairLabelBg,
        },
        horzLine: {
          width: 1,
          color: chartTheme.crosshairColor,
          style: 1,
          labelBackgroundColor: chartTheme.crosshairLabelBg,
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    };

    const chart = createChart(container, { ...chartOptions, width, height });
    chartRef.current = chart;

    const volumeSeries = chart.addSeries(HistogramSeries);
    volumeSeries.applyOptions({
      priceFormat: { type: "volume" },
      priceScaleId: "left",
      color: chartTheme.seriesSecondary,
      base: 0,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      visible: true,
    });
    volumeSeriesRef.current = volumeSeries;

    if (volumeDataSeries.length > 0) volumeSeries.setData(volumeDataSeries);
    recreatePriceSeries();
    chart.timeScale().fitContent();
    chart.timeScale().applyOptions({
      minBarSpacing: 1,
      fixLeftEdge: true,
      fixRightEdge: true,
      rightOffset: 0,
    });

    if (showTooltip) {
      chart.subscribeCrosshairMove((param) => {
        const active = priceSeriesRef.current as any;
        if (param.time && active) {
          const pricePoint = param.seriesData.get(active);
          const volume = param.seriesData.get(volumeSeries);
          if (pricePoint) {
            if (typeof pricePoint === "number") setCurrentPrice(Number(pricePoint));
            else if ("value" in (pricePoint as object) && typeof (pricePoint as any).value === "number")
              setCurrentPrice((pricePoint as any).value);
            else if ("close" in (pricePoint as object) && typeof (pricePoint as any).close === "number")
              setCurrentPrice((pricePoint as any).close);
          }
          if (volume) setCurrentVolume(Number(volume));
        } else {
          setCurrentPrice(null);
          setCurrentVolume(null);
        }
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && parentElement) {
        chartRef.current.resize(parentElement.offsetWidth, parentElement.offsetHeight);
      }
    });
    if (parentElement) resizeObserver.observe(parentElement);

    return () => {
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      glowSeriesRef.current = null;
      volumeSeriesRef.current = null;
      lensLineRef.current = null;
      selectedLineRef.current = null;
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Token-driven theme updates (no recreate => no flicker).
  useEffect(() => {
    if (!chartRef.current || !volumeSeriesRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        textColor: chartTheme.textColor,
        background: { type: "solid", color: chartTheme.backgroundColor } as SolidColor,
      },
      grid: {
        vertLines: { color: chartTheme.gridColor },
        horzLines: { color: chartTheme.gridColor },
      },
      crosshair: {
        vertLine: { color: chartTheme.crosshairColor, labelBackgroundColor: chartTheme.crosshairLabelBg },
        horzLine: { color: chartTheme.crosshairColor, labelBackgroundColor: chartTheme.crosshairLabelBg },
      },
    });

    volumeSeriesRef.current.applyOptions({ color: chartTheme.seriesSecondary });

    // Update series colors without re-creating series (avoid flicker).
    if (selectedChartType === "line") {
      glowSeriesRef.current?.applyOptions({
        color: withAlpha(chartTheme.seriesPrimary, 0.18),
      });
      (priceSeriesRef.current as ISeriesApi<"Line"> | null)?.applyOptions({
        color: chartTheme.seriesPrimary,
        priceLineColor: chartTheme.seriesPrimary,
      });
    } else if (selectedChartType === "area") {
      glowSeriesRef.current?.applyOptions({
        color: withAlpha(chartTheme.seriesPrimary, 0.16),
      });
      (priceSeriesRef.current as ISeriesApi<"Area"> | null)?.applyOptions({
        lineColor: chartTheme.seriesPrimary,
        topColor: withAlpha(chartTheme.seriesPrimary, 0.20),
        bottomColor: withAlpha(chartTheme.seriesPrimary, 0.02),
      });
    } else {
      (priceSeriesRef.current as ISeriesApi<"Candlestick"> | null)?.applyOptions({
        upColor: chartTheme.candleUp,
        downColor: chartTheme.candleDown,
        wickUpColor: chartTheme.candleWickUp,
        wickDownColor: chartTheme.candleWickDown,
        borderUpColor: chartTheme.candleUp,
        borderDownColor: chartTheme.candleDown,
      });
    }
  }, [chartTheme]);

  // Update price data series
  useEffect(() => {
    if (selectedChartType !== "candle") {
      if (glowSeriesRef.current && priceDataSeries.length > 0) glowSeriesRef.current.setData(priceDataSeries);
      if (priceSeriesRef.current && priceDataSeries.length > 0) (priceSeriesRef.current as ISeriesApi<"Line">).setData(priceDataSeries);

      // Calculate price change
      if (priceDataSeries.length >= 2) {
        const firstPrice = priceDataSeries[0].value;
        const lastPrice = priceDataSeries[priceDataSeries.length - 1].value;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;

        setPriceChangePercent(changePercent);
      }
    }
  }, [priceDataSeries, selectedChartType]);

  // Update volume data series
  useEffect(() => {
    if (volumeSeriesRef.current && volumeDataSeries.length > 0) {
      volumeSeriesRef.current.setData(volumeDataSeries);
    }
  }, [volumeDataSeries]);

  useEffect(() => {
    if (selectedChartType !== "candle") return;
    if (!priceSeriesRef.current) return;
    (priceSeriesRef.current as ISeriesApi<"Candlestick">).setData(candleDataSeries ?? []);
  }, [candleDataSeries, selectedChartType]);

  useEffect(() => {
    recreatePriceSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChartType]);

  // Liquidity Lens + selected marker lines
  useEffect(() => {
    const priceSeries = priceSeriesRef.current;
    if (!priceSeries) return;

    if (lensLineRef.current) {
      priceSeries.removePriceLine(lensLineRef.current);
      lensLineRef.current = null;
    }
    if (typeof lensPrice === "number" && Number.isFinite(lensPrice)) {
      lensLineRef.current = (priceSeries as any).createPriceLine({
        price: lensPrice,
        color: chartTheme.lensLineColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Lens",
      });
    }
  }, [lensPrice, chartTheme.lensLineColor]);

  useEffect(() => {
    const priceSeries = priceSeriesRef.current;
    if (!priceSeries) return;

    if (selectedLineRef.current) {
      priceSeries.removePriceLine(selectedLineRef.current);
      selectedLineRef.current = null;
    }
    if (typeof selectedPrice === "number" && Number.isFinite(selectedPrice)) {
      selectedLineRef.current = (priceSeries as any).createPriceLine({
        price: selectedPrice,
        color: chartTheme.seriesPrimary,
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: "Selected",
      });
    }
  }, [selectedPrice, chartTheme.seriesPrimary]);

  // Handle time frame change
  const handleTimeFrameChange = (timeFrame: TimeFrame) => {
    setSelectedTimeFrame(timeFrame);
    if (onTimeFrameChange) {
      onTimeFrameChange(timeFrame);
    }
  };

  // Handle chart type change
  const handleChartTypeChange = (chartType: ChartType) => {
    setSelectedChartType(chartType);
    if (onChartTypeChange) {
      onChartTypeChange(chartType);
    }
  };

  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      {/* Chart Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{symbol}</p>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {priceChangePercent >= 0 ? "+" : ""}
            {priceChangePercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          {HeaderComponent ? HeaderComponent : null}

          {(showTimeFrameControls || showChartTypeControls) && (
            <div className="flex gap-2">
              {showTimeFrameControls && (
                <div className="flex overflow-hidden rounded-md border border-border">
                  {(["5m", "15m", "1h", "4h", "1d", "1w"] as TimeFrame[]).map((tf) => (
                    <button
                      key={tf}
                      className={cn(
                        "px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        selectedTimeFrame === tf
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => handleTimeFrameChange(tf)}
                      aria-label={`Select timeframe ${tf}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}

              {showChartTypeControls && (
                <div className="flex overflow-hidden rounded-md border border-border">
                  {(["line", "area", "candle"] as ChartType[]).map((type) => (
                    <button
                      key={type}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        selectedChartType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => handleChartTypeChange(type)}
                      aria-label={`Select chart type ${type}`}
                    >
                      {chartTypeIcons[type]}
                      <span className="hidden sm:inline">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1 border-b border-border">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {showTooltip && currentPrice && (
          <div className="absolute right-3 top-3 z-10 rounded-md border border-border bg-popover p-2 text-xs text-popover-foreground shadow-sm">
            <div className="text-muted-foreground">Price</div>
            <div className="font-mono text-foreground">{formatQubicAmount(currentPrice)}</div>
            {currentVolume && (
              <div className="mt-1">
                <div className="text-muted-foreground">Volume</div>
                <div className="font-mono text-foreground">{currentVolume.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="h-full w-full"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
}
