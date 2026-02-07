import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchAssetAskOrders, fetchAssetBidOrders } from "@/services/api.service";
import { useState, useEffect } from "react";
import { AssetOrder } from "@/types/qx.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { fetchBalance, fetchOwnedAssets } from "@/services/rpc.service";
import usePlaceOrder from "@/hooks/usePlaceOrder";
import toast from "react-hot-toast";
import { useAtom } from "jotai";
import { refetchAtom } from "@/store/action";

const OrderModal: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: string;
    asset: string;
    issuer: string;
}> = ({ open, onOpenChange, type, asset, issuer }) => {
    const { connected, toggleConnectModal, wallet } = useQubicConnect();
    const { placeOrder } = usePlaceOrder();
    const [price, setPrice] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [sliderValue, setSliderValue] = useState<number[]>([0]);
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isBuyOrder = type === "bids";
    const orderType = isBuyOrder ? "Buy" : "Sell";
    const priceNum = Number(price) || 0;
    const amountNum = Number(amount) || 0;
    const total = priceNum > 0 && amountNum > 0 ? (priceNum * amountNum).toLocaleString() : "---";

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setPrice("");
            setAmount("");
            setSliderValue([0]);
        }
    }, [open]);

    // Fetch available balance when modal opens
    useEffect(() => {
        if (!open || !connected || !wallet?.publicKey) {
            setAvailableBalance(null);
            return;
        }

        const fetchAvailableBalance = async () => {
            try {
                if (isBuyOrder) {
                    const balance = await fetchBalance(wallet.publicKey);
                    setAvailableBalance(balance?.balance ?? null);
                } else {
                    const ownedAssets = await fetchOwnedAssets(wallet.publicKey);
                    const assetData = ownedAssets?.find(
                        (a: { asset: string; issuerId: string }) => a.asset === asset && a.issuerId === issuer
                    );
                    setAvailableBalance(assetData?.amount ?? 0);
                }
            } catch (error) {
                console.error("Error fetching balance:", error);
                setAvailableBalance(null);
            }
        };

        fetchAvailableBalance();
    }, [connected, wallet?.publicKey, open, isBuyOrder, asset, issuer]);

    // Update amount based on slider percentage of available balance
    useEffect(() => {
        if (availableBalance === null || availableBalance <= 0) return;
        const pct = sliderValue[0] / 100;
        if (isBuyOrder) {
            if (priceNum > 0) {
                setAmount(String(Math.floor((availableBalance / priceNum) * pct)));
            }
        } else {
            setAmount(String(Math.floor(availableBalance * pct)));
        }
    }, [sliderValue, priceNum, availableBalance, isBuyOrder]);

    const handleSubmit = async () => {
        if (!connected) {
            onOpenChange(false);
            toggleConnectModal();
            return;
        }

        if (priceNum <= 0 || priceNum % 1 !== 0) {
            toast.error("Price must be a positive integer");
            return;
        }
        if (amountNum <= 0 || amountNum % 1 !== 0) {
            toast.error("Amount must be a positive integer");
            return;
        }

        if (isBuyOrder && availableBalance !== null && availableBalance < priceNum * amountNum) {
            toast.error("Insufficient balance");
            return;
        }
        if (!isBuyOrder && availableBalance !== null && availableBalance < amountNum) {
            toast.error("Insufficient asset balance");
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await placeOrder(asset, isBuyOrder ? "buy" : "sell", priceNum, amountNum, true);
            if (success) onOpenChange(false);
        } catch (error) {
            console.error("Failed to submit order:", error);
            toast.error("Failed to submit order");
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayBalance = connected && availableBalance !== null
        ? availableBalance.toLocaleString()
        : "---";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{orderType} {asset}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="text-sm text-muted-foreground">
                        Available: <span className="font-bold text-foreground">{displayBalance}</span> <span className="font-bold text-foreground">{isBuyOrder ? "qus" : asset}</span>
                    </div>
                    <div className="relative">
                        <Input
                            type="number"
                            placeholder="Price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">qus</span>
                    </div>
                    <div className="relative">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{asset}</span>
                    </div>
                    <Slider
                        value={sliderValue}
                        onValueChange={setSliderValue}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <div className="text-sm text-muted-foreground">
                        Total: <span className="font-bold text-foreground">{total}</span> <span className="font-bold text-foreground">qus</span>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={cn(
                            "w-full text-black font-semibold",
                            type === "asks"
                                ? "bg-red-400 hover:bg-red-500"
                                : "bg-green-400 hover:bg-green-500"
                        )}
                    >
                        {!connected ? "CONNECT" : isSubmitting ? "SUBMITTING..." : orderType.toUpperCase()}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const AssetOrders: React.FC<{ issuer: string; asset: string; type: string }> = ({ issuer, asset, type }) => {
    const [assetOrders, setAssetOrders] = useState<AssetOrder[]>([]);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [refetch] = useAtom(refetchAtom);
    const { connected, toggleConnectModal } = useQubicConnect();
    const { placeOrder } = usePlaceOrder();

    useEffect(() => {
        const fetchOrders = async () => {
            const res = type === "asks"
                ? await fetchAssetAskOrders(issuer, asset)
                : await fetchAssetBidOrders(issuer, asset);
            setAssetOrders(res);
        };
        fetchOrders();
    }, [issuer, asset, type, refetch]);

    const handleActionClick = async (order: AssetOrder) => {
        if (!connected) {
            toggleConnectModal();
            return;
        }

        try {
            const action = type === "asks" ? "buy" : "sell";
            await placeOrder(asset, action, order.price, order.numberOfShares, false);
        } catch (error) {
            console.error("Failed to fill order:", error);
            toast.error("Failed to fill order");
        }
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-4">
            <div className="flex items-center justify-center">
                <p
                    className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setOrderModalOpen(true)}
                >
                    Open {type === "asks" ? "Sell" : "Buy"} Orders
                </p>
            </div>
            <OrderModal
                open={orderModalOpen}
                onOpenChange={setOrderModalOpen}
                type={type}
                asset={asset}
                issuer={issuer}
            />
            <div className="flex-1 min-h-0 overflow-hidden border border-border/60 bg-card/70 p-2 shadow-inner shadow-black/5 dark:shadow-black/40">
                <ScrollArea type="hover" scrollHideDelay={200} className="h-full max-h-full">
                    <div className="pr-1">
                        <Table
                            wrapperClassName="h-full min-h-0 !overflow-visible"
                            className="table-auto [&_td]:whitespace-nowrap [&_td]:text-center [&_th]:text-center"
                        >
                            <TableHeader className="text-xs sticky top-0 z-20 border-b border-border/60 bg-card/90 backdrop-blur-sm [&_th]:sticky [&_th]:top-0 [&_th]:bg-card/90 [&_th]:text-card-foreground [&_th]:shadow-sm">
                                <TableRow>
                                    <TableHead>Price(Qu)</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Total(Qu)</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/40 text-muted-foreground text-xs">
                                {assetOrders.map((order, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{order.price.toLocaleString()}</TableCell>
                                        <TableCell className="!text-right">{order.numberOfShares.toLocaleString()}</TableCell>
                                        <TableCell className="!text-right">{(order.price * order.numberOfShares).toLocaleString()}</TableCell>
                                        <TableCell className="!text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(type === "asks" ? "bg-green-500 text-white hover:bg-green-900" : "bg-red-500 text-white hover:bg-red-900")}
                                                onClick={() => handleActionClick(order)}
                                            >
                                                {type === "asks" ? "Buy" : "Sell"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default AssetOrders;
