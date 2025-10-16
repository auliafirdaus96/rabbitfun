import { useMemo, useState } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  height?: string;
  className?: string;
}

const TradingViewWidget = ({
  symbol,
  height = "h-[360px] md:h-[460px]",
  className = ""
}: TradingViewWidgetProps) => {
  const [iframeError, setIframeError] = useState(false);

  // Memoize the TradingView URL to prevent unnecessary re-renders
  const tradingViewUrl = useMemo(() => {
    return `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=5&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&enable_publishing=0&allow_symbol_change=1&locale=id`;
  }, [symbol]);

  const handleIframeError = () => {
    console.warn('TradingView widget failed to load');
    setIframeError(true);
  };

  if (iframeError) {
    return (
      <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
        <div className={`${height} flex items-center justify-center`}>
          <div className="text-center text-muted-foreground">
            <div className="mb-2">📊</div>
            <p className="text-sm">Chart temporarily unavailable</p>
            <p className="text-xs">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <div className={`${height}`}>
        <iframe
          title="TradingView Chart"
          src={tradingViewUrl}
          className="w-full h-full border-0 overflow-hidden"
          allowtransparency="true"
          style={{ scrolling: 'no' }}
          loading="lazy"
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

export default TradingViewWidget;