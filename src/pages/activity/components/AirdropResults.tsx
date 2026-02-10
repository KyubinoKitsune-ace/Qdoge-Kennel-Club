import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAirdropResults, fetchAirdropPreview, fetchUserInfo, type AirdropResult } from "@/services/backend.service";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface AirdropResultsProps {
  epoch: number;
  searchTerm?: string;
  connectedWallet?: string | null;
}

const MEDAL_EMOJIS = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;

const WalletCell = ({ wallet, isZealyRegistered, connectedWallet }: { wallet: string; isZealyRegistered: boolean; connectedWallet: string | null }) => {
  const isYou = connectedWallet && wallet === connectedWallet;
  return (
    <div className="flex items-center gap-1">
      {isYou ? (
        <span className="text-yellow-500 font-semibold">YOU</span>
      ) : (
        <Link to={`/entity/${wallet}`} className="text-primary hover:text-primary/70">
          {wallet.slice(0, 5)}...{wallet.slice(-5)}
        </Link>
      )}
      {isZealyRegistered && <span className="text-green-500 text-xs">✅</span>}
    </div>
  );
};

const formatAmount = (amount: string): string => {
  const num = Number(amount);
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toLocaleString();
};

const AirdropResults: React.FC<AirdropResultsProps> = ({ epoch, searchTerm = "", connectedWallet = null }) => {
  const [results, setResults] = useState<AirdropResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [totalAirdrop, setTotalAirdrop] = useState<string>("0");
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!connectedWallet) {
        setIsAdmin(false);
        return;
      }
      try {
        const userInfo = await fetchUserInfo(connectedWallet);
        setIsAdmin(userInfo.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdminRole();
  }, [connectedWallet]);

  useEffect(() => {
    const getAirdropResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        try {
          const storedResults = await fetchAirdropResults(epoch);
          if (storedResults.length > 0) {
            setResults(storedResults);
            setIsPreview(false);
            return;
          }
        } catch (err) {
          console.log("No stored results, fetching preview...");
        }
        
        const previewData = await fetchAirdropPreview(epoch);
        setResults(previewData.results);
        setIsPreview(previewData.preview);
        setTotalAirdrop(previewData.total_airdrop);
      } catch (err) {
        console.error("Failed to fetch airdrop results:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch airdrop results");
      } finally {
        setIsLoading(false);
      }
    };
    
    getAirdropResults();
  }, [epoch]);

  // Filter results by search term
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r => r.wallet_id.toLowerCase().includes(term));
  }, [results, searchTerm]);

  // Download Excel file
  const handleDownloadExcel = useCallback(() => {
    if (results.length === 0) return;

    // Prepare data with all fields
    const excelData = results.map((r) => ({
      wallet_id: r.wallet_id,
      token_amt: r.token_amount,
      buy_amt: r.buy_amount,
      airdrop_amt: r.airdrop_amount,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 62 }, // wallet_id column width
      { wch: 15 }, // token_amt column width
      { wch: 15 }, // buy_amt column width
      { wch: 20 }, // airdrop_amt column width
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Airdrop Results");

    // Generate filename with epoch number
    const filename = `airdrop_epoch_${epoch}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  }, [results, epoch]);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xl font-bold">Airdrop Results</p>
          {isPreview && (
            <Badge variant="outline" className="border-yellow-500/50 bg-yellow-500/10 text-yellow-500">
              Live Preview
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalAirdrop !== "0" && (
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatAmount(totalAirdrop)}</span>
            </div>
          )}
          {isAdmin && results.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          )}
        </div>
      </div>

      {/* Live Preview Disclaimer */}
      {isPreview && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500">
          ⚠️ This is a live preview and does not reflect the final list. Changes may be made before the final distribution. <br />
          ✅  - Zealy Registered
        </div>
      )}

      {/* Table - Auto height based on content */}
      <div className="w-full border border-border/60 bg-card/70 p-2 shadow-inner shadow-black/5 dark:shadow-black/40">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading airdrop results...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No airdrop results available</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No results match "{searchTerm}"</p>
          </div>
        ) : (
          <div className="w-full">
            {searchTerm && (
              <div className="mb-2 text-xs text-muted-foreground">
                Showing {filteredResults.length} of {results.length} results
              </div>
            )}
            <Table className="table-auto [&_td]:whitespace-nowrap [&_td]:text-center [&_th]:text-center">
              <TableHeader className="text-xs border-b border-border/60 bg-card/90 [&_th]:bg-card/90 [&_th]:text-card-foreground">
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Wallet ID</TableHead>
                  <TableHead>Token Amt</TableHead>
                  <TableHead>Buy Amt</TableHead>
                  <TableHead>Airdrop Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40 text-muted-foreground text-xs">
                {filteredResults.map((result) => (
                  <TableRow key={result.rank}>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {MEDAL_EMOJIS[result.rank as keyof typeof MEDAL_EMOJIS] && (
                          <span>{MEDAL_EMOJIS[result.rank as keyof typeof MEDAL_EMOJIS]}</span>
                        )}
                        <span className="font-semibold">{result.rank}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <WalletCell wallet={result.wallet_id} isZealyRegistered={result.is_zealy_registered} connectedWallet={connectedWallet} />
                    </TableCell>
                    <TableCell className="!text-right text-blue-500 font-medium">
                      {formatAmount(result.token_amount)}
                    </TableCell>
                    <TableCell className="!text-right text-green-500 font-medium">
                      {formatAmount(result.buy_amount)}
                    </TableCell>
                    <TableCell className="!text-right text-primary font-semibold">
                      {formatAmount(result.airdrop_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AirdropResults;
