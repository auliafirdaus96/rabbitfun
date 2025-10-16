import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { List } from 'react-window';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Heart, TrendingUp } from 'lucide-react';
import type { TokenInfo } from '@/types/api';

// Token Row Component (memoized for performance)
interface TokenRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tokens: TokenInfo[];
    onLike: (tokenId: string) => void;
    formatMarketCap: (value: number) => string;
  };
}

const TokenRow = memo(({ index, style, data }: TokenRowProps) => {
  const token = data.tokens[index];
  const isLiked = Math.random() > 0.5; // Mock liked state

  // Calculate derived values from TokenInfo
  const initialPrice = parseFloat(token.initialPrice) || 0;
  const totalBNB = parseFloat(token.totalBNB) || 0;
  const soldSupply = parseFloat(token.soldSupply) || 0;
  const currentPrice = totalBNB > 0 && soldSupply > 0 ? totalBNB / soldSupply : initialPrice;

  // Mock values for properties that don't exist in TokenInfo
  const mockMarketCap = currentPrice * soldSupply;
  const mockPriceChange = (Math.random() - 0.5) * 20; // -10% to +10%
  const mockProgress = Math.min(100, (soldSupply / 1000000000) * 100); // Progress based on sold supply
  const mockVolume = Math.random() * 100000;
  const mockHolders = Math.floor(Math.random() * 1000);

  return (
    <div style={style} className="border-b border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 p-3">
        {/* Token Image */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {token.symbol?.substring(0, 2) || 'TK'}
            </span>
          </div>
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/token/${token.tokenAddress}`}
              className="font-semibold text-foreground hover:text-primary transition-colors truncate"
            >
              {token.name}
            </Link>
            {token.graduated && (
              <span className="text-blue-500 text-xs">✓</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {token.symbol} • MC {data.formatMarketCap(mockMarketCap)}
          </div>
        </div>

        {/* Price & Change */}
        <div className="flex flex-col items-end min-w-[120px]">
          <div className="text-sm font-medium">
            ${currentPrice.toFixed(6)}
          </div>
          <div className={`text-xs ${mockPriceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {mockPriceChange >= 0 ? '▲' : '▼'} {Math.abs(mockPriceChange).toFixed(2)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-[180px] min-w-[100px]">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${mockProgress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 min-w-[80px]">
          <button
            onClick={() => data.onLike(token.tokenAddress)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLiked
                ? 'text-red-500 hover:text-red-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <Link
            to={`/token/${token.tokenAddress}`}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
});

TokenRow.displayName = 'TokenRow';

// Main Virtualized Token List Component
interface VirtualizedTokenListProps {
  tokens: TokenInfo[];
  onLike: (tokenId: string) => void;
  formatMarketCap: (value: number) => string;
  height?: number;
  itemHeight?: number;
  overscanCount?: number;
  className?: string;
}

export const VirtualizedTokenList: React.FC<VirtualizedTokenListProps> = ({
  tokens,
  onLike,
  formatMarketCap,
  height = 600,
  itemHeight = 96,
  overscanCount = 5,
  className = ''
}) => {
  const [listHeight, setListHeight] = useState(height);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update height based on container
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        setListHeight(containerHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Memoize data to prevent re-renders
  const itemData = useMemo(() => ({
    tokens,
    onLike,
    formatMarketCap
  }), [tokens, onLike, formatMarketCap]);

  // Render item callback
  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <TokenRow
      index={index}
      style={style}
      data={itemData}
    />
  ), [itemData]);

  // Memoize item key for performance
  const getItemKey = useCallback((index: number) => {
    const token = tokens[index];
    return `${token.tokenAddress}-${token.lastTradeTime || index}`;
  }, [tokens]);

  if (!tokens || tokens.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center h-96 text-muted-foreground ${className}`}
      >
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No tokens found</div>
          <div className="text-sm">Create your first token to get started!</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {React.createElement(
        List as any,
        {
          height: listHeight,
          itemCount: tokens.length,
          itemSize: itemHeight,
          itemData: itemData,
          overscanCount: overscanCount,
          getItemKey: getItemKey,
          renderItem: renderItem,
          // Performance optimizations
          initialScrollOffset: 0,
          className: "token-list",
          // Custom styles for better performance
          style: {
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5)',
          }
        }
      )}
    </div>
  );
};

// Optimized hook for infinite scrolling (future implementation)
export const useInfiniteScroll = (
  fetchMore: () => Promise<any>,
  hasMore: boolean,
  threshold = 0.8
) => {
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setLoading(true);
          try {
            await fetchMore();
          } catch (error) {
            console.error('Failed to fetch more items:', error);
          } finally {
            setLoading(false);
          }
        }
      },
      {
        threshold,
        root: containerRef.current?.parentElement || null,
        rootMargin: '100px'
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMore, hasMore, loading, threshold]);

  return { containerRef, loading, observerRef };
};

// Featured Token Card (Dark Theme Design)
interface OptimizedTokenCardProps {
  token: TokenInfo;
  onLike: (tokenId: string) => void;
  formatMarketCap: (value: number) => string;
  index: number;
}

export const OptimizedTokenCard = memo<OptimizedTokenCardProps>(({
  token,
  onLike,
  formatMarketCap,
  index
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Calculate derived values from TokenInfo
  const initialPrice = parseFloat(token.initialPrice) || 0;
  const totalBNB = parseFloat(token.totalBNB) || 0;
  const soldSupply = parseFloat(token.soldSupply) || 0;
  const currentPrice = totalBNB > 0 && soldSupply > 0 ? totalBNB / soldSupply : initialPrice;

  // Mock values for properties that don't exist in TokenInfo
  const mockMarketCap = currentPrice * soldSupply;
  const mockPriceChange = (Math.random() - 0.5) * 20; // -10% to +10%
  const mockProgress = Math.min(100, (soldSupply / 800000000) * 100); // 800M max supply
  const mockVolume = Math.random() * 100000;
  const mockHolders = Math.floor(Math.random() * 1000);
  const mockDescription = `A revolutionary token built on the BNB chain with innovative features and strong community backing.`;

  // Helper functions
  const formatMarketCapCard = (cap: number) => {
    if (cap >= 1000000) {
      return `$${(cap / 1000000).toFixed(1)}M`;
    } else if (cap >= 1000) {
      return `$${(cap / 1000).toFixed(1)}K`;
    }
    return `$${cap.toFixed(0)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const getExplorerUrl = (address: string) => {
    return `https://bscscan.com/address/${address}`;
  };

  const getTimeAgo = (createdAt?: string) => {
    if (!createdAt) return "1d ago";
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "1h ago";
  };

  const handleClick = () => {
    console.log('🔄 Navigating to token detail:', token.tokenAddress);
    // Navigate to token detail page
    window.open(`/token/${token.tokenAddress}`, '_blank');
  };

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onLike(token.tokenAddress);
  }, [onLike, token.tokenAddress, isFavorited]);

  return (
    <div
      onClick={handleClick}
      className={`relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-2xl p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer border border-neutral-700/50 hover:border-purple-500/30 ${
        isHovered ? 'transform hover:-translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`
      }}
    >
      {/* Featured Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
          <Heart className="h-3 w-3 text-white" />
          <span className="text-xs font-bold text-white">HOT</span>
        </div>
      </div>

      {/* Favorite Button */}
      <button
        className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 hover:bg-neutral-700/80 transition-all duration-200"
        onClick={handleLike}
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors duration-200 ${
            isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-400'
          }`}
        />
      </button>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-transparent to-pink-500"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full filter blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/20 rounded-full filter blur-2xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex gap-4 mb-4">
          {/* Logo Area */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 border-2 border-neutral-700 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {token.symbol?.substring(0, 2) || 'TK'}
              </span>
            </div>
          </div>

          {/* Info Area */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <h3 className="text-lg font-bold text-white mb-1 truncate">{token.name}</h3>
              <p className="text-sm font-medium text-gray-300 mb-1">{token.symbol}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">by</span>
                <span className="text-xs text-purple-400 font-medium">
                  {formatAddress(token.creator)}
                </span>
                <span className="text-xs text-gray-400">• {getTimeAgo(token.createdAt)}</span>
              </div>
              {token.graduated && (
                <div className="mt-1">
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                    ✓ Graduated
                  </span>
                </div>
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-800/50 rounded-lg p-2 border border-neutral-700/30">
                <div className="text-xs text-gray-400 mb-0.5">Market Cap</div>
                <div className="text-sm font-bold text-white">{formatMarketCapCard(mockMarketCap)}</div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-2 border border-neutral-700/30">
                <div className="text-xs text-gray-400 mb-0.5">24h Volume</div>
                <div className="text-sm font-bold text-white">{formatVolume(mockVolume)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bonding Progress Section */}
        <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/30 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-medium text-gray-300">Bonding Progress</span>
            </div>
            <span
              className={`text-xs font-bold ${
                mockPriceChange >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {mockPriceChange >= 0 ? "▲" : "▼"} {Math.abs(mockPriceChange).toFixed(1)}%
            </span>
          </div>

          <div className="relative">
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 rounded-full transition-all duration-700 ease-out shadow-lg shadow-green-500/20"
                style={{ width: `${mockProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs text-gray-400 font-medium">{mockProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
            {mockDescription}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              <span className="font-mono bg-neutral-800/50 px-2 py-1 rounded border border-neutral-700/30">
                {formatAddress(token.tokenAddress)}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              <span className="font-medium">{mockHolders}</span> holders
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getExplorerUrl(token.tokenAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-neutral-700/50 transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                token.graduated
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105'
              }`}
              disabled={token.graduated}
              onClick={(e) => e.stopPropagation()}
            >
              {token.graduated ? 'Graduated' : 'Trade Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

OptimizedTokenCard.displayName = 'OptimizedTokenCard';