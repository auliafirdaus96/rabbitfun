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
    <div className="space-y-4">
      {/* Mascot / Token card */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-3xl">
          {coinLogo}
        </div>
        <div>
          <div className="text-sm font-medium">{coinName} Mascot</div>
          <div className="text-xs text-muted-foreground">Meme | {coinTicker}</div>
          {contractAddress && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-medium">Contract:</span>
              <span className="font-mono">{contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}</span>
              <button
                onClick={() => navigator.clipboard.writeText(contractAddress)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy contract address"
              >
                📋
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Holder */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Top Holders</div>
          <button className="rounded-lg border border-border bg-card px-3 py-1 text-xs hover:bg-muted/40 transition-colors">
            Generate Bubble Map
          </button>
        </div>
        <div className="py-2">
          <ul className="divide-y divide-border">
            {/* Liquidity Pool as first holder */}
            <li className="flex items-center justify-between px-0 py-2 text-sm">
              <div className="flex items-center gap-2 truncate">
                <span className="text-foreground">Liquidity Pool</span>
                <span className="text-blue-400 text-xs" title="Liquidity Pool">💧</span>
              </div>
              <span className="text-muted-foreground">35.00%</span>
            </li>
            {holders.slice(0, 14).map((h, idx) => (
              <li key={idx} className="flex items-center justify-between px-0 py-2 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-foreground">{h.label}</span>
                  {h.kind === 'lp' && (
                    <span className="text-blue-400 text-xs" title="Liquidity Pool">💧</span>
                  )}
                </div>
                <span className="text-muted-foreground">{h.percent.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
          {holders.length > 15 && (
            <div className="flex justify-center mt-3">
              <div className="flex gap-1">
                <button className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">
                  Previous
                </button>
                <span className="px-2 py-1 text-xs">1</span>
                <button className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
          <div className="py-2 text-[11px] text-muted-foreground text-center">
            Top holders distribution (mock data)
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldersSidebar;