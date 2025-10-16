
interface Trade {
  account: string;
  type: "BUY" | "SELL";
  amountBNB: number | string;
  amountToken: string;
  time: number;
  txn: string;
}

interface TradesSectionProps {
  trades: Trade[];
  visible: Trade[];
  sortKey: "amount" | "side" | "time";
  sortDir: "asc" | "desc";
  pageSafe: number;
  totalPages: number;
  toggleSort: (key: "amount" | "side" | "time") => void;
  setPage: (page: (prev: number) => number) => void;
  coinTicker: string;
}

const TradesSection = ({
  trades,
  visible,
  sortKey,
  sortDir,
  pageSafe,
  totalPages,
  toggleSort,
  setPage,
  coinTicker
}: TradesSectionProps) => {
  // Function to format wallet address (5 chars front, 4 chars back)
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 9) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  
  return (
    <>
      <div className="py-2">
        {/* Header columns */}
        <div className="grid grid-cols-6 gap-2 px-4 py-2 text-xs uppercase text-muted-foreground border-b border-border">
          <div className="text-left">Account</div>
          <button
            onClick={() => toggleSort("side")}
            className="text-left hover:text-foreground transition-colors"
          >
            Type
            {sortKey === "side" && (
              <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
          <button
            onClick={() => toggleSort("amount")}
            className="text-left hover:text-foreground transition-colors"
          >
            Amount (BNB)
            {sortKey === "amount" && (
              <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
          <div className="text-left">Amount ({coinTicker})</div>
          <button
            onClick={() => toggleSort("time")}
            className="text-left hover:text-foreground transition-colors"
          >
            Time
            {sortKey === "time" && (
              <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
          <div className="text-left">Txn</div>
        </div>

        <div className="divide-y divide-border">
          {visible.map((t, i) => (
            <div
              key={`${t.account}-${i}`}
              className="grid grid-cols-6 gap-2 px-4 py-2 text-sm hover:bg-muted/20 transition-colors"
            >
              <div className="truncate text-muted-foreground font-mono">{formatWalletAddress(t.account)}</div>
              <div
                className="font-bold text-base"
                style={{
                  color: t.type?.toUpperCase() === 'BUY' ? '#10b981' : t.type?.toUpperCase() === 'SELL' ? '#ef4444' : '#6b7280'
                }}
              >
                {t.type?.toUpperCase() || 'UNKNOWN'}
              </div>
              <div className="text-foreground font-mono">{parseFloat(String(t.amountBNB || '0')).toFixed(3)}</div>
              <div className="text-muted-foreground">{t.amountToken}</div>
              <div className="text-muted-foreground">
                {Math.floor((Date.now() - t.time) / (1000 * 60))}m ago
              </div>
              <div className="text-muted-foreground font-mono text-xs">{formatWalletAddress(t.txn)}</div>
            </div>
          ))}

          {visible.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No trades found
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground flex-shrink-0 border-t border-border">
        <div>
          Page {pageSafe} / {totalPages || 1} ({trades.length} total trades)
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 rounded-md border border-border bg-card disabled:opacity-50 hover:bg-muted/40 transition-colors"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="px-2 py-1 rounded-md border border-border bg-card disabled:opacity-50 hover:bg-muted/40 transition-colors"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default TradesSection;