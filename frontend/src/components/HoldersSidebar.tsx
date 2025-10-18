interface Holder {
  label: string;
  percent: number;
  kind?: "lp";
}

interface HoldersSidebarProps {
  holders: Holder[];
  coinName: string;
  coinTicker: string;
  coinLogo: string;
  contractAddress?: string;
}

const HoldersSidebar = ({
  holders,
  coinName,
  coinTicker,
  coinLogo,
  contractAddress
}: HoldersSidebarProps) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Mascot / Token card */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center text-2xl sm:text-3xl">
          {coinLogo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm font-medium truncate">{coinName} Mascot</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Meme | {coinTicker}</div>
          {contractAddress && (
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
              <span className="font-medium">Contract:</span>
              <span className="font-mono truncate">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</span>
              <button
                onClick={() => navigator.clipboard.writeText(contractAddress)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Copy contract address"
              >
                📋
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Holder */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="text-xs sm:text-sm font-semibold">Top Holders</div>
          <button className="rounded-lg border border-border bg-card px-2 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs hover:bg-muted/40 transition-colors whitespace-nowrap">
            Generate Bubble Map
          </button>
        </div>
        <div className="py-2 max-h-80 sm:max-h-96 overflow-y-auto">
          <ul className="divide-y divide-border">
            {/* Liquidity Pool as first holder */}
            <li className="flex items-center justify-between px-0 py-1.5 sm:py-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-2 truncate flex-1 min-w-0">
                <span className="text-foreground truncate">Liquidity Pool</span>
                <span className="text-blue-400 text-[10px] sm:text-xs flex-shrink-0" title="Liquidity Pool">💧</span>
              </div>
              <span className="text-muted-foreground text-xs sm:text-sm flex-shrink-0 ml-2">35.00%</span>
            </li>
            {holders.slice(0, 14).map((h, idx) => (
              <li key={idx} className="flex items-center justify-between px-0 py-1.5 sm:py-2 text-xs sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-2 truncate flex-1 min-w-0">
                  <span className="text-foreground truncate">{h.label}</span>
                  {h.kind === 'lp' && (
                    <span className="text-blue-400 text-[10px] sm:text-xs flex-shrink-0" title="Liquidity Pool">💧</span>
                  )}
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm flex-shrink-0 ml-2">{h.percent.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
          {holders.length > 15 && (
            <div className="flex justify-center mt-2 sm:mt-3">
              <div className="flex gap-1">
                <button className="px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-xs rounded border border-border hover:bg-muted transition-colors">
                  Previous
                </button>
                <span className="px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-xs">1</span>
                <button className="px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-xs rounded border border-border hover:bg-muted transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
          <div className="py-2 text-[10px] sm:text-[11px] text-muted-foreground text-center">
            Top holders distribution (mock data)
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldersSidebar;