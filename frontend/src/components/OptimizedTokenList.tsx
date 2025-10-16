import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VirtualizedTokenList, useInfiniteScroll } from './VirtualizedTokenList';
import { TrendingTokenCard } from './TrendingTokenCard';
import { FeaturedTokenCard } from './FeaturedTokenCard';
import { cache } from '@/utils/cache';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, Star, TrendingUp } from 'lucide-react';
import type { TokenInfo } from '@/types/api';
import { convertToTrendingToken, convertToFeaturedToken, getFeaturedTokens, getTrendingTokens } from '@/utils/tokenAdapter';

interface OptimizedTokenListProps {
  onLike: (tokenId: string) => void;
  formatMarketCap: (value: number) => string;
  variant?: 'list' | 'grid';
  className?: string;
  showFilters?: boolean;
}

// Generate realistic dummy token data
const generateDummyTokens = (count: number = 20): TokenInfo[] => {
  const tokenNames = [
    'Rabbit Coin', 'Moon Rocket', 'Diamond Hands', 'HODL Strong', 'Crypto Bull',
    'Green Candle', 'To The Moon', 'Stonks', 'Wen Lambo', 'Satoshi Vision',
    'DeFi Gem', 'Yield Farm', 'Liquidity Pool', 'Smart Contract', 'Block Chain',
    'Digital Gold', 'Crypto King', 'Token Power', 'Web3 Future', 'Meta Verse'
  ];

  const tokenSymbols = [
    'RABBIT', 'MOON', 'DIAMOND', 'HODL', 'BULL',
    'GREEN', 'MOON2', 'STONK', 'LAMBO', 'SAT',
    'GEM', 'YIELD', 'POOL', 'SMART', 'BLOCK',
    'GOLD', 'KING', 'POWER', 'WEB3', 'META'
  ];

  return Array.from({ length: count }, (_, index) => {
    const soldSupply = Math.floor(Math.random() * 900000000) + 100000000; // 100M - 1B
    const totalBNB = Math.floor(Math.random() * 500) + 10; // 10 - 510 BNB
    const initialPrice = parseFloat((Math.random() * 0.001 + 0.0001).toFixed(6)); // 0.0001 - 0.001
    const currentPrice = totalBNB > 0 && soldSupply > 0 ? totalBNB / soldSupply : initialPrice;

    return {
      tokenAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: tokenNames[index % tokenNames.length],
      symbol: tokenSymbols[index % tokenSymbols.length],
      metadata: `ipfs://QmXxx${Math.random().toString(16).substr(2, 20)}`,
      creator: `0x${Math.random().toString(16).substr(2, 40)}`,
      soldSupply: soldSupply.toString(),
      totalBNB: totalBNB.toString(),
      initialPrice: initialPrice.toString(),
      slope: (Math.random() * 0.0001).toFixed(8),
      graduated: Math.random() > 0.8, // 20% graduated
      exists: true,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastTradeTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      totalPlatformFees: (Math.random() * 10).toFixed(4),
      totalCreatorFees: (Math.random() * 5).toFixed(4),
      bondingCurveLiquidity: (Math.random() * 100).toFixed(4),
      liquidityPoolAmount: (Math.random() * 200).toFixed(4)
    };
  });
};

// Fetch tokens with caching
const fetchTokens = async (page: number = 1, limit: number = 50, filters?: any): Promise<{
  tokens: TokenInfo[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  const cacheKey = `tokens_page_${page}_limit_${limit}_${JSON.stringify(filters || {})}`;

  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached as {
      tokens: TokenInfo[];
      total: number;
      page: number;
      totalPages: number;
    };
  }

  // Generate realistic dummy data
  const allTokens = generateDummyTokens(50); // Total 50 dummy tokens
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTokens = allTokens.slice(startIndex, endIndex);

  // Apply basic sorting if filters are provided
  let sortedTokens = [...paginatedTokens];
  if (filters?.sortBy) {
    sortedTokens.sort((a, b) => {
      const aValue = parseFloat(a.totalBNB || '0');
      const bValue = parseFloat(b.totalBNB || '0');
      return filters.order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }

  const mockData = {
    tokens: sortedTokens,
    total: allTokens.length,
    page,
    totalPages: Math.ceil(allTokens.length / limit)
  };

  // Cache the result
  cache.set(cacheKey, mockData, cache.getSmart ? 2 * 60 * 1000 : 5 * 60 * 1000); // 2 minutes

  return mockData;
};

// Fetch trending tokens with longer cache
const fetchTrendingTokens = async (): Promise<TokenInfo[]> => {
  const cacheKey = 'trending_tokens';

  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached as TokenInfo[];
  }

  // Generate trending tokens (top performing ones)
  const allTokens = generateDummyTokens(12); // 12 tokens for grid view
  const trendingTokens = allTokens
    .sort((a, b) => parseFloat(b.totalBNB || '0') - parseFloat(a.totalBNB || '0'))
    .slice(0, 12)
    .map((token, index) => ({
      ...token,
      graduated: index < 3 // Top 3 are graduated
    }));

  // Cache longer for trending tokens
  cache.set(cacheKey, trendingTokens, 30 * 60 * 1000); // 30 minutes

  return trendingTokens;
};

export const OptimizedTokenList: React.FC<OptimizedTokenListProps> = ({
  onLike,
  formatMarketCap,
  variant = 'list',
  className = '',
  showFilters = false
}) => {
  const [filters, setFilters] = useState({
    sortBy: 'volume',
    order: 'desc',
    minVolume: 0,
    minMarketCap: 0
  });

  const [sortBy, setSortBy] = useState('volume');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  // Infinite scroll for list view
  const { containerRef, loading: loadingMore } = useInfiniteScroll(
    async () => {
      const nextPage = page + 1;
      const result = await fetchTokens(nextPage, 50, { ...filters, sortBy, order });
      setPage(nextPage);

      // Append to existing tokens
      queryClient.setQueryData(['tokens', filters, sortBy, order], (old: any) => {
        if (!old) return result;
        return {
          ...old,
          tokens: [...old.tokens, ...result.tokens],
          page: nextPage,
          totalPages: result.totalPages
        };
      });

      return result;
    },
    true // hasMore parameter simplified for now
  );

  // Regular query for grid view
  const {
    data: tokensData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tokens', filters, sortBy, order, page],
    queryFn: () => fetchTokens(page, variant === 'grid' ? 12 : 50, { ...filters, sortBy, order }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData // keepPreviousData replaced with placeholderData in v5
  });

  // Trending tokens query
  const {
    data: trendingData,
    isLoading: isLoadingTrending
  } = useQuery({
    queryKey: ['trendingTokens'],
    queryFn: fetchTrendingTokens,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (renamed from cacheTime in v5)
    refetchOnWindowFocus: false
  });

  // Preload images (disabled for now since imageUrl doesn't exist in TokenInfo)
  // useEffect(() => {
  //   if (tokensData?.tokens) {
  //     const imageUrls = tokensData.tokens
  //       .map(token => (token as any).imageUrl)
  //       .filter(Boolean)
  //       .slice(0, 20); // Preload first 20 images

  //     if (imageUrls.length > 0) {
  //       import('@/utils/cache').then(({ imageCache }) => {
  //         imageCache.preload(imageUrls);
  //       });
  //     }
  //   }
  // }, [tokensData?.tokens]);

  // Memoized handlers
  const handleSortChange = useCallback((newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setOrder(newOrder);
    setPage(1);

    // Reset cache when filters change
    queryClient.invalidateQueries({ queryKey: ['tokens'] });

    // Update filters
    setFilters(prev => ({ ...prev, sortBy: newSortBy, order: newOrder }));
  }, [queryClient]);

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setPage(1);

    // Reset cache when filters change
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
  }, [queryClient]);

  const handleRefresh = useCallback(() => {
    // Clear cache and refetch
    cache.deleteSmart('tokens');
    queryClient.invalidateQueries({ queryKey: ['tokens'] });
    queryClient.invalidateQueries({ queryKey: ['trendingTokens'] });

    if (variant === 'list') {
      setPage(1);
      queryClient.resetQueries({ queryKey: ['tokens', filters, sortBy, order] });
    }

    refetch();
  }, [queryClient, variant, filters, sortBy, order, refetch]);

  const handleLike = useCallback((tokenId: string) => {
    // Optimistic update (simplified since likes doesn't exist in TokenInfo)
    queryClient.setQueryData(['tokens'], (old: any) => {
      if (!old?.tokens) return old;

      return {
        ...old,
        tokens: old.tokens.map((token: any) =>
          token.tokenAddress === tokenId
            ? { ...token, liked: true } // Using a simple liked flag instead
            : token
        )
      };
    });

    // Update cache (simplified)
    const existingToken = tokensData?.tokens?.find((t: any) => t.tokenAddress === tokenId);
    cache.setSmart(`token_detail_${tokenId}`, {
      ...existingToken,
      liked: true
    });

    onLike(tokenId);
  }, [queryClient, tokensData, onLike]);

  // Memoized featured tokens (top 3)
  const featuredTokens = useMemo(() => {
    const allTokens = variant === 'grid' ? (trendingData || []) : (tokensData?.tokens || []);
    return getFeaturedTokens(allTokens, 3);
  }, [variant, trendingData, tokensData]);

  // Memoized trending tokens (excluding featured)
  const trendingTokens = useMemo(() => {
    const allTokens = variant === 'grid' ? (trendingData || []) : (tokensData?.tokens || []);
    return getTrendingTokens(allTokens, 12);
  }, [variant, trendingData, tokensData]);

  // Memoized tokens for list view
  const tokens = useMemo(() => {
    if (variant === 'grid') {
      return trendingData || [];
    }
    return tokensData?.tokens || [];
  }, [variant, trendingData, tokensData]);

  // Loading skeleton
  const renderSkeleton = () => {
    if (variant === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-muted"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
                <div className="h-2 bg-muted rounded-full w-full mb-3"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load tokens</h3>
        <p className="text-muted-foreground mb-4">Please try again later</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  // Empty state
  if (!isLoading && !error && tokens.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-6xl mb-4">🪙</div>
        <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
        <p className="text-muted-foreground mb-4">Create your first token to get started!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center p-4 bg-muted/20 rounded-lg">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value, order as 'asc' | 'desc')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="volume">Volume</option>
            <option value="marketCap">Market Cap</option>
            <option value="price">Price</option>
            <option value="createdAt">Created</option>
          </select>

          <select
            value={order}
            onChange={(e) => handleSortChange(sortBy, e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Min Volume:</span>
            <input
              type="number"
              value={filters.minVolume}
              onChange={(e) => handleFilterChange({ ...filters, minVolume: Number(e.target.value) })}
              className="px-2 py-1 bg-background border border-border rounded text-sm w-20"
              min="0"
              step="0.01"
            />
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Tokens */}
      {variant === 'grid' ? (
        <div ref={containerRef} className="space-y-8">
          {/* Featured Tokens Section */}
          {featuredTokens.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-xl font-bold">Featured Tokens</h2>
              </div>
              <div className="flex flex-col lg:flex-row gap-6 justify-center">
                {isLoadingTrending ? (
                  // Featured skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="min-w-[600px] animate-pulse">
                      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-8">
                        <div className="flex gap-6">
                          <div className="w-32 h-32 bg-neutral-700 rounded-2xl"></div>
                          <div className="flex-1 space-y-4">
                            <div className="h-8 bg-neutral-700 rounded w-1/3"></div>
                            <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="h-16 bg-neutral-700 rounded-xl"></div>
                              <div className="h-16 bg-neutral-700 rounded-xl"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  featuredTokens.map((token) => (
                    <div key={token.id} className="flex justify-center">
                      <FeaturedTokenCard
                        token={token}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Trending Tokens Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h2 className="text-xl font-bold">Trending Tokens</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoadingTrending ? (
                renderSkeleton()
              ) : (
                trendingTokens.map((token) => (
                  <TrendingTokenCard
                    key={token.id}
                    token={token}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div ref={containerRef}>
          {isLoading ? (
            renderSkeleton()
          ) : (
            <VirtualizedTokenList
              tokens={tokens}
              onLike={handleLike}
              formatMarketCap={formatMarketCap}
              className="rounded-lg border border-border bg-background"
            />
          )}

          {/* Load More Button */}
          {variant === 'list' && tokensData && tokensData.page < tokensData.totalPages && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loadingMore}
                variant="outline"
                className="min-w-[120px]"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};