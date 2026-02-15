import { useAtomValue } from "jotai";
import { qtreatzOverviewAtom } from "@/store/qtreatzOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Database, Ratio } from "lucide-react";

function formatAmount(value: string | null | undefined, maxFractionDigits = 6): string {
  if (value == null) return "---";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFractionDigits }).format(num);
}

function shortWallet(wallet: string): string {
  if (!wallet) return "---";
  return `${wallet.slice(0, 7)}...${wallet.slice(-6)}`;
}

export default function QTreatzOverview() {
  const overview = useAtomValue(qtreatzOverviewAtom);
  const updatedAt = overview ? new Date(overview.updated_at).toLocaleString("en-US", { timeZone: "UTC" }) : null;

  if (!overview) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">QTREATZ realtime panel is warming up</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting for backend websocket snapshot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-primary/90">Realtime</Badge>
          <Badge variant="secondary">QTREATZ Dashboard</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Updated: {updatedAt}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Qubic Balance</CardTitle>
            <Coins className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">{formatAmount(overview.qtreatz_wallet.qubic_balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Wallet: <span className="font-medium text-foreground">{shortWallet(overview.qtreatz_wallet.wallet_id)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Circulating QTREAT</CardTitle>
            <Database className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-500">{formatAmount(overview.circulating_qtreat)}</p>
            <p className="text-xs text-muted-foreground mt-1">Formula:</p>
            <p className="text-xs font-medium text-foreground">
              {formatAmount(overview.qtreat_total_supply)} - {formatAmount(overview.qdoge_wallet.qtreat_asset_balance)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card shadow-sm">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">QTREAT Dividend</CardTitle>
            <Ratio className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {overview.qubic_per_circulating_qtreat
                ? formatAmount(String(Math.floor(Number(overview.qubic_per_circulating_qtreat))))
                : "---"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Qubic balance divided by circulating QTREAT.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">All Assets In QTREATZ Wallet</CardTitle>
            <Badge variant="outline">{overview.qtreatz_wallet.assets.length} assets</Badge>
          </div>
          <Separator className="mt-2" />
        </CardHeader>
        <CardContent>
          <Table
            wrapperClassName="max-h-[420px] rounded-md border border-border/60"
            className="table-auto [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
          >
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4">Asset</TableHead>
                <TableHead className="pr-4 text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.qtreatz_wallet.assets.map((asset) => (
                <TableRow key={asset.asset_name} className="hover:bg-primary/5">
                  <TableCell className="pl-4 font-medium">{asset.asset_name}</TableCell>
                  <TableCell className="pr-4 text-right font-semibold">{formatAmount(asset.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
