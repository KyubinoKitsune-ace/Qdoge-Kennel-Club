import { useEffect, useMemo, useRef, useState } from "react";
import { ISSUER } from "@/constants";
import { fetchAssetAskOrders, fetchAssetBidOrders } from "@/services/api.service";
import type { AssetOrder } from "@/types";
import { cn } from "@/utils";
import Chart from "@/pages/qxassetdetail/components/Chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import usePlaceOrder from "@/hooks/usePlaceOrder";
import toast from "react-hot-toast";

type Side = "bid" | "ask";

type Level = {
  side: Side;
  price: number;
  size: number;
  total: number;
  cum: number;
  depthPct: number; // 0..1
};

const ASSETS = ["QDOGE", "QTREAT"] as const;
type Asset = (typeof ASSETS)[number];
const DEFAULT_ASSET: Asset = "QDOGE";
const DEFAULT_LEVELS_PER_SIDE = 24;

function groupToLevels(side: Side, orders: AssetOrder[], maxLevels: number): Level[] {
  const byPrice = new Map<number, number>();
  for (const o of orders) {
    byPrice.set(o.price, (byPrice.get(o.price) ?? 0) + o.numberOfShares);
  }

  const entries = Array.from(byPrice.entries()).map(([price, size]) => ({ price, size }));
  entries.sort((a, b) => (side === "ask" ? a.price - b.price : b.price - a.price));
  const top = entries.slice(0, maxLevels);

  let cum = 0;
  const withCum = top.map(({ price, size }) => {
    cum += size;
    return { price, size, cum };
  });
  const maxCum = withCum.at(-1)?.cum ?? 0;

  return withCum.map(({ price, size, cum }) => ({
    side,
    price,
    size,
    total: price * size,
    cum,
    depthPct: maxCum > 0 ? cum / maxCum : 0,
  }));
}

function formatInt(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "---";
  return Math.trunc(n).toLocaleString();
}

function useMediaQuery(query: string) {
  const getMatches = () => (typeof window === "undefined" ? false : window.matchMedia(query).matches);
  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();

    // Safari <14 uses addListener/removeListener
    // eslint-disable-next-line deprecation/deprecation
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    // eslint-disable-next-line deprecation/deprecation
    else mql.addListener(onChange);

    return () => {
      // eslint-disable-next-line deprecation/deprecation
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      // eslint-disable-next-line deprecation/deprecation
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

interface OrderbookCockpitProps {
  asset?: Asset;
}

export default function OrderbookCockpit({ asset: assetProp }: OrderbookCockpitProps) {
  const { placeOrder } = usePlaceOrder();

  const asset = assetProp ?? DEFAULT_ASSET;
  const issuer = ISSUER.get(asset) ?? "";

  const [asksRaw, setAsksRaw] = useState<AssetOrder[]>([]);
  const [bidsRaw, setBidsRaw] = useState<AssetOrder[]>([]);
  const [loadingBook, setLoadingBook] = useState<boolean>(true);

  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredSide, setHoveredSide] = useState<Side | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);

  const [mobileTab, setMobileTab] = useState<"ladder" | "chart">("ladder");
  const [ticketOpen, setTicketOpen] = useState(false);

  const [ticketSide, setTicketSide] = useState<"buy" | "sell">("buy");
  const [priceInput, setPriceInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitPulse, setCommitPulse] = useState(false);
  const commitPulseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (commitPulseTimeoutRef.current) window.clearTimeout(commitPulseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!issuer) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const fetchOnce = async () => {
      try {
        const [asks, bids] = await Promise.all([fetchAssetAskOrders(issuer, asset), fetchAssetBidOrders(issuer, asset)]);
        if (cancelled) return;
        setAsksRaw(asks ?? []);
        setBidsRaw(bids ?? []);
        setLoadingBook(false);
      } catch (e) {
        if (cancelled) return;
        setLoadingBook(false);
      }
    };

    fetchOnce();
    intervalId = window.setInterval(fetchOnce, 1500);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [issuer]);

  const { asks, bids, bestAsk, bestBid, mid, spread } = useMemo(() => {
    const asks = groupToLevels("ask", asksRaw, DEFAULT_LEVELS_PER_SIDE);
    const bids = groupToLevels("bid", bidsRaw, DEFAULT_LEVELS_PER_SIDE);

    const bestAsk = asks.at(0)?.price ?? null; // asks sorted ascending
    const bestBid = bids.at(0)?.price ?? null; // bids sorted descending
    const mid = bestAsk != null && bestBid != null ? (bestAsk + bestBid) / 2 : null;
    const spread = bestAsk != null && bestBid != null ? bestAsk - bestBid : null;

    return { asks, bids, bestAsk, bestBid, mid, spread };
  }, [asksRaw, bidsRaw]);

  const lensPrice = hoveredPrice ?? selectedPrice ?? null;

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const commitPrice = (price: number, side: Side) => {
    // Intuitive mapping: selecting an ask typically implies buying; selecting a bid implies selling.
    setTicketSide(side === "ask" ? "buy" : "sell");
    setSelectedPrice(price);
    setSelectedSide(side);
    setPriceInput(Math.trunc(price).toLocaleString());
    setHoveredPrice(null);
    setHoveredSide(null);

    setCommitPulse(true);
    if (commitPulseTimeoutRef.current) window.clearTimeout(commitPulseTimeoutRef.current);
    commitPulseTimeoutRef.current = window.setTimeout(() => setCommitPulse(false), 180);

    if (!isDesktop) setTicketOpen(true);
  };

  const previewPriceText = hoveredPrice != null ? formatInt(hoveredPrice) : null;
  const selectedPriceText = selectedPrice != null ? formatInt(selectedPrice) : null;

  const parsedPrice = Number(priceInput.replace(/,/g, ""));
  const parsedAmount = Number(amountInput.replace(/,/g, ""));
  const total = Number.isFinite(parsedPrice) && Number.isFinite(parsedAmount) && parsedPrice > 0 && parsedAmount > 0 ? parsedPrice * parsedAmount : null;

  const handleSubmit = async () => {
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice % 1 !== 0) {
      toast.error("Price must be a positive integer");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount % 1 !== 0) {
      toast.error("Amount must be a positive integer");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await placeOrder(asset, ticketSide === "buy" ? "buy" : "sell", parsedPrice, parsedAmount, true);
      if (ok) {
        setAmountInput("");
        if (!isDesktop) setTicketOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ticket = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
              ticketSide === "buy"
                ? "border-border bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => setTicketSide("buy")}
            aria-label="Select Buy"
          >
            Buy
          </button>
          <button
            className={cn(
              "rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
              ticketSide === "sell"
                ? "border-border bg-destructive text-destructive-foreground"
                : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => setTicketSide("sell")}
            aria-label="Select Sell"
          >
            Sell
          </button>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">Spread</div>
          <div className="font-mono text-xs text-foreground">
            {formatInt(bestBid)} / {formatInt(bestAsk)}
            <span className="text-muted-foreground"> · </span>
            {spread != null ? `${formatInt(spread)} qus` : "---"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Selected</div>
            <div className="font-mono text-sm text-foreground">{selectedPriceText ?? "---"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Preview</div>
            <div className="font-mono text-sm text-foreground">{previewPriceText ?? "---"}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Limit price"
            value={priceInput}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setPriceInput(v ? Number(v).toLocaleString() : "");
            }}
            className={cn(
              "pr-14 font-mono",
              commitPulse && (ticketSide === "buy" ? "ring-2 ring-chart-2" : "ring-2 ring-chart-1"),
            )}
            aria-label="Limit price in qus"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">qus</span>
        </div>

        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Amount"
            value={amountInput}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setAmountInput(v ? Number(v).toLocaleString() : "");
            }}
            className="pr-16 font-mono"
            aria-label={`Amount in ${asset}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{asset}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono text-foreground">{total != null ? `${formatInt(total)} qus` : "---"}</span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant={ticketSide === "buy" ? "default" : "destructive"}
          className="w-full"
          aria-label={`${ticketSide === "buy" ? "Buy" : "Sell"} ${asset}`}
        >
          {isSubmitting ? "Submitting..." : `${ticketSide === "buy" ? "Buy" : "Sell"} ${asset}`}
        </Button>
      </div>
    </div>
  );

  const ladderKeys = useMemo(() => {
    const askKeys = asks.map((lvl) => `ask:${lvl.price}`);
    const bidKeys = bids.map((lvl) => `bid:${lvl.price}`);
    return [...askKeys, ...bidKeys];
  }, [asks, bids]);

  const rowRefMap = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const asksScrollRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledAsksRef = useRef(false);

  // Callback ref to scroll to bottom when the asks container is mounted
  const setAsksScrollRef = (el: HTMLDivElement | null) => {
    asksScrollRef.current = el;
    if (el && !hasScrolledAsksRef.current && asks.length > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        hasScrolledAsksRef.current = true;
      });
    }
  };

  // Also scroll when asks data first loads (in case ref was already attached)
  useEffect(() => {
    if (!loadingBook && asks.length > 0 && !hasScrolledAsksRef.current && asksScrollRef.current) {
      requestAnimationFrame(() => {
        if (asksScrollRef.current) {
          asksScrollRef.current.scrollTop = asksScrollRef.current.scrollHeight;
          hasScrolledAsksRef.current = true;
        }
      });
    }
  }, [loadingBook, asks.length]);

  const focusRowByKey = (key: string) => {
    const el = rowRefMap.current.get(key);
    el?.scrollIntoView?.({ block: "nearest" });
    el?.focus();
  };

  const handleLadderKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement | null;
    const key = target?.getAttribute?.("data-ob-key");
    if (!key) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = ladderKeys.indexOf(key);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown" ? Math.min(ladderKeys.length - 1, idx + 1) : Math.max(0, idx - 1);
      focusRowByKey(ladderKeys[nextIdx]);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const [side, priceStr] = key.split(":");
      const price = Number(priceStr);
      if ((side === "ask" || side === "bid") && Number.isFinite(price)) {
        commitPrice(price, side);
      }
      return;
    }

    if (e.key === "Escape") {
      setHoveredPrice(null);
      setHoveredSide(null);
    }
  };

  const ladder = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-semibold text-foreground">Orderbook</p>
            <span className="text-xs text-muted-foreground">{asset}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Liquidity Lens: hover/focus a row to sync chart + ticket</p>
        </div>
        <div className="hidden md:flex lg:hidden">
          <Drawer open={ticketOpen} onOpenChange={setTicketOpen}>
            <DrawerTrigger asChild>
              <Button size="sm" variant="outline" aria-label="Open trade ticket">
                Trade
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Trade {asset}</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6">{ticket}</div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="col-span-4">Price</div>
          <div className="col-span-4 text-right">Size</div>
          <div className="col-span-4 text-right">Total</div>
        </div>

        <div
          className="flex-1 min-h-0"
          role="listbox"
          aria-label="Orderbook ladder"
          onKeyDown={handleLadderKeyDown}
        >
          {/* Split ladder: Sell (asks) always visible above Buy (bids) */}
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sell (asks)</span>
              <span className="text-[11px] text-muted-foreground">Best: {bestAsk != null ? formatInt(bestAsk) : "---"}</span>
            </div>

            <div ref={setAsksScrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="divide-y divide-border/40">
                {[...asks].reverse().map((lvl) => {
                  const isHovered = hoveredPrice === lvl.price && hoveredSide === "ask";
                  const isSelected = selectedPrice === lvl.price && selectedSide === "ask";
                  return (
                    <button
                      key={`ask-${lvl.price}`}
                      type="button"
                      className={cn(
                        "relative grid w-full grid-cols-12 gap-2 px-3 py-2 text-left text-xs transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        "hover:bg-muted/30",
                        isSelected && "bg-muted/40",
                      )}
                      role="option"
                      aria-selected={isSelected}
                      data-ob-key={`ask:${lvl.price}`}
                      ref={(el) => rowRefMap.current.set(`ask:${lvl.price}`, el)}
                      onPointerEnter={() => {
                        setHoveredPrice(lvl.price);
                        setHoveredSide("ask");
                      }}
                      onPointerLeave={() => {
                        setHoveredPrice(null);
                        setHoveredSide(null);
                      }}
                      onFocus={() => {
                        setHoveredPrice(lvl.price);
                        setHoveredSide("ask");
                      }}
                      onBlur={() => {
                        setHoveredPrice(null);
                        setHoveredSide(null);
                      }}
                      onClick={() => commitPrice(lvl.price, "ask")}
                      aria-label={`Ask at ${lvl.price} qus, size ${lvl.size}`}
                    >
                      <div
                        className="pointer-events-none absolute inset-y-0 right-0 bg-chart-1/10"
                        style={{ width: `${Math.round(lvl.depthPct * 100)}%` }}
                      />
                      {(isHovered || isSelected) && (
                        <div className="pointer-events-none absolute inset-0 bg-primary/10 ring-1 ring-primary/20" />
                      )}
                      <div className="col-span-4 font-mono text-chart-1">{formatInt(lvl.price)}</div>
                      <div className="col-span-4 text-right font-mono text-foreground">{formatInt(lvl.size)}</div>
                      <div className="col-span-4 text-right font-mono text-muted-foreground">{formatInt(lvl.total)}</div>
                    </button>
                  );
                })}
              </div>

              {(loadingBook || asksRaw.length === 0) && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {loadingBook ? "Loading sell orders..." : "No sell orders."}
                </div>
              )}
            </div>

            {/* Mid / Spread Divider (always visible) */}
            <div className="shrink-0 border-y border-border bg-card/80 backdrop-blur-sm">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-xs",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                  "hover:bg-muted/30",
                )}
                onClick={() => {
                  if (mid == null) return;
                  commitPrice(Math.round(mid), "bid");
                }}
                aria-label="Set limit price to mid"
              >
                <span className="text-muted-foreground">Mid</span>
                <span className="font-mono text-foreground">{mid != null ? formatInt(mid) : "---"}</span>
                <span className="text-muted-foreground">Spread</span>
                <span className="font-mono text-foreground">{spread != null ? formatInt(spread) : "---"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buy (bids)</span>
              <span className="text-[11px] text-muted-foreground">Best: {bestBid != null ? formatInt(bestBid) : "---"}</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="divide-y divide-border/40">
                {bids.map((lvl) => {
                  const isHovered = hoveredPrice === lvl.price && hoveredSide === "bid";
                  const isSelected = selectedPrice === lvl.price && selectedSide === "bid";
                  return (
                    <button
                      key={`bid-${lvl.price}`}
                      type="button"
                      className={cn(
                        "relative grid w-full grid-cols-12 gap-2 px-3 py-2 text-left text-xs transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                        "hover:bg-muted/30",
                        isSelected && "bg-muted/40",
                      )}
                      role="option"
                      aria-selected={isSelected}
                      data-ob-key={`bid:${lvl.price}`}
                      ref={(el) => rowRefMap.current.set(`bid:${lvl.price}`, el)}
                      onPointerEnter={() => {
                        setHoveredPrice(lvl.price);
                        setHoveredSide("bid");
                      }}
                      onPointerLeave={() => {
                        setHoveredPrice(null);
                        setHoveredSide(null);
                      }}
                      onFocus={() => {
                        setHoveredPrice(lvl.price);
                        setHoveredSide("bid");
                      }}
                      onBlur={() => {
                        setHoveredPrice(null);
                        setHoveredSide(null);
                      }}
                      onClick={() => commitPrice(lvl.price, "bid")}
                      aria-label={`Bid at ${lvl.price} qus, size ${lvl.size}`}
                    >
                      <div
                        className="pointer-events-none absolute inset-y-0 right-0 bg-chart-2/10"
                        style={{ width: `${Math.round(lvl.depthPct * 100)}%` }}
                      />
                      {(isHovered || isSelected) && (
                        <div className="pointer-events-none absolute inset-0 bg-primary/10 ring-1 ring-primary/20" />
                      )}
                      <div className="col-span-4 font-mono text-chart-2">{formatInt(lvl.price)}</div>
                      <div className="col-span-4 text-right font-mono text-foreground">{formatInt(lvl.size)}</div>
                      <div className="col-span-4 text-right font-mono text-muted-foreground">{formatInt(lvl.total)}</div>
                    </button>
                  );
                })}
              </div>

              {(loadingBook || bidsRaw.length === 0) && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {loadingBook ? "Loading buy orders..." : "No buy orders."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const chartPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <Chart
          className="h-full w-full"
          issuer={issuer}
          asset={asset}
          lensPrice={lensPrice ?? undefined}
          selectedPrice={selectedPrice ?? undefined}
          showChartTypeControls={true}
          showTimeFrameControls={false}
        />
      </div>
    </div>
  );

  const ticketPanelDesktop = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Trade Ticket</p>
          <p className="text-[11px] text-muted-foreground">Click a ladder price to set limit</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-3">{ticket}</div>
    </div>
  );

  if (!issuer) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-border bg-card/40 p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">Orderbook unavailable</p>
          <p className="text-xs text-muted-foreground">Issuer for {asset} is not configured.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col">
      {/* Desktop cockpit */}
      <div className="hidden h-full min-h-0 w-full grid-cols-12 gap-3 lg:grid">
        <div className="col-span-3 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {ladder}
        </div>
        <div className="col-span-6 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {chartPanel}
        </div>
        <div className="col-span-3 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {ticketPanelDesktop}
        </div>
      </div>

      {/* Tablet */}
      <div className="hidden h-full min-h-0 w-full grid-cols-12 gap-3 md:grid lg:hidden">
        <div className="col-span-5 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {ladder}
        </div>
        <div className="col-span-7 min-h-0 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {chartPanel}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as "ladder" | "chart")}>
            <TabsList>
              <TabsTrigger value="ladder" aria-label="Show ladder">
                OrderList {/* Ladder */}
              </TabsTrigger>
              <TabsTrigger value="chart" aria-label="Show chart">
                Chart
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Drawer open={ticketOpen} onOpenChange={setTicketOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open trade ticket">
                Trade
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Trade {asset}</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6">{ticket}</div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card/40 shadow-sm">
          {mobileTab === "ladder" ? ladder : chartPanel}
        </div>
      </div>
    </section>
  );
}

