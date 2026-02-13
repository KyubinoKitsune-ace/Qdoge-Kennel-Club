import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiBell, FiSettings, FiX } from "react-icons/fi";
import { BiHistory } from "react-icons/bi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdOutlineShoppingCart, MdOutlineReceiptLong } from "react-icons/md";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { fetchEntityAskOrders, fetchEntityBidOrders } from "@/services/api.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AccountStatus from "./AccountStatus";
import { EntityOrder } from "@/types";
import UserTradeHistory from "./UserTradeHistory";
import SettingPanel from "./SettingPanel";
import usePlaceOrder from "@/hooks/usePlaceOrder";

const UserNormal: React.FC = () => {
  const [activeTab, setActiveTab] = useState("settings");
  const { wallet } = useQubicConnect();
  const [askOrders, setAskOrders] = useState<EntityOrder[]>([]);
  const [bidOrders, setBidOrders] = useState<EntityOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { placeOrder } = usePlaceOrder();

  const address = wallet?.publicKey;

  useEffect(() => {
    if (!address) return;

    const fetchOrders = async () => {
      setLoading(true);
      setLoading(true);
      try {
        const entityId = address;
        const [asks, bids] = await Promise.all([fetchEntityAskOrders(entityId), fetchEntityBidOrders(entityId)]);
        setAskOrders(asks);
        setBidOrders(bids);
      } catch (error) {
        console.error("Failed to fetch orders or trades:", error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "activity") {
      fetchOrders();
    }
  }, [activeTab, address]);

  const handleCancelOrder = (order: EntityOrder, type: "buy" | "sell") => {
    placeOrder(order.assetName, type === "buy" ? "rmBuy" : "rmSell", order.price, order.numberOfShares);
  };

  const renderOrders = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }

    const allOrders = [
      ...bidOrders.map((order) => ({ ...order, type: "buy" as const })),
      ...askOrders.map((order) => ({ ...order, type: "sell" as const })),
    ];

    if (allOrders.length === 0) {
      return <div className="py-8 text-center text-gray-500">No orders found</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{order.assetName}</TableCell>
              <TableCell>
                <Badge variant={order.type === "buy" ? "secondary" : "destructive"} className="px-2 py-0.5">
                  {order.type === "buy" ? "Buy" : "Sell"}
                </Badge>
              </TableCell>
              <TableCell className={order.type === "buy" ? "text-green-500" : "text-red-500"}>
                {order.price.toLocaleString()}
              </TableCell>
              <TableCell>{order.numberOfShares.toLocaleString()}</TableCell>
              <TableCell>{(order.price * order.numberOfShares).toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20"
                  onClick={() => handleCancelOrder(order, order.type)}
                >
                  <FiX className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto min-h-screen px-4 py-2">
      <Card className="mx-auto w-full max-w-4xl border-0 shadow-lg">
        <div className="p-4">
          <CardHeader className="space-y-2 rounded-t-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardTitle className="text-2xl font-bold">Account</CardTitle>
            <AccountStatus address={address || ""} />
          </CardHeader>
        </div>

        <CardContent className="p-4">
          <Tabs defaultValue="settings" onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 gap-2 rounded-lg p-1">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <FiSettings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <BiHistory className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-8">
              <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium">
                    <FiBell className="h-5 w-5 text-blue-600" />
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <SettingPanel connectedWallet={address || ""} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {address ? (
                <div className="space-y-8">
                  <Card className="overflow-hidden border-0 shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-lg font-medium">
                        <MdOutlineShoppingCart className="h-5 w-5 text-blue-600" />
                        Your Open Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">{renderOrders()}</CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 shadow-sm">
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-lg font-medium">
                        <MdOutlineReceiptLong className="h-5 w-5 text-blue-600" />
                        Trade History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <UserTradeHistory address={address || ""} />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">Please connect your wallet to view your activity</p>
                </div>
              )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserNormal;
