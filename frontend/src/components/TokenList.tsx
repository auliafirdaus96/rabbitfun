import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTokenList } from '@/hooks/useTokenData';
import { useWebSocket } from '@/hooks/useWebSocket';
import { webSocketService } from '@/services/websocket';
import TradingViewWidget from '@/components/TradingViewWidget';
import { ExternalLink, Search, RefreshCw, Rocket, TrendingUp, Users, ChevronRight, Filter, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatEther, parseEther } from 'ethers';
import { calculateProgressFromSupply, getProgressStatus } from '@/utils/bondingCurve';
import type { TokenInfo } from '@/types/api';

interface FilterOptions {
  status: 'all' | 'active' | 'graduated';
  sortBy: 'raised' | 'newest' | 'name' | 'progress';
  order: 'asc' | 'desc';
}

export const TokenList = () => {
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    sortBy: 'raised',
    order: 'desc'
  });
  const [realtimeUpdates, setRealtimeUpdates] = useState(true);

  const { isConnected } = useWeb3();
  const { isConnected: wsConnected } = useWebSocket();

  // Use the useTokenList hook with filters
  const {
    tokens,
    isLoading,
    error,
    refetch,
    searchQuery,
    handleSearch,
    totalCount,
    pagination
  } = useTokenList({
    ...filters,
    limit: 20,
    page: 1
  });

  // Apply additional client-side filtering and sorting
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = [...tokens];

    // Apply status filter
    if (filters.status === 'active') {
      filtered = filtered.filter(token => !token.graduated);
    } else if (filters.status === 'graduated') {
      filtered = filtered.filter(token => token.graduated);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'raised':
          comparison = parseFloat(b.totalBNB || '0') - parseFloat(a.totalBNB || '0');
          break;
        case 'newest':
          comparison = 0; // Would need creation timestamp
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'progress':
          const progressA = calculateProgressFromSupply(parseFloat(a.soldSupply || '0'));
          const progressB = calculateProgressFromSupply(parseFloat(b.soldSupply || '0'));
          comparison = progressB - progressA;
          break;
      }

      return filters.order === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tokens, filters]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (realtimeUpdates && wsConnected) {
      // Listen for new tokens
      const handleTokenCreated = (data: any) => {
        toast.success('New token created!', {
          description: `${data.name} (${data.symbol})`,
          action: {
            label: 'View',
            onClick: () => window.open(`/token/${data.tokenAddress}`, '_blank')
          }
        });
        refetch();
      };

      // Listen for token graduations
      const handleTokenGraduated = (data: any) => {
        toast.info('Token graduated!', {
          description: `${data.token.name} has graduated to DEX`,
          action: {
            label: 'Trade on DEX',
            onClick: () => window.open(`https://pancakeswap.finance/swap?outputCurrency=${data.token.tokenAddress}`, '_blank')
          }
        });
        refetch();
      };

      // Listen for price updates
      const handlePriceUpdate = (data: any) => {
        // Could trigger a UI update for price changes
        refetch();
      };

      webSocketService.on('token_created', handleTokenCreated);
      webSocketService.on('token_graduated', handleTokenGraduated);
      webSocketService.on('token_price_update', handlePriceUpdate);

      return () => {
        webSocketService.off('token_created', handleTokenCreated);
        webSocketService.off('token_graduated', handleTokenGraduated);
        webSocketService.off('token_price_update', handlePriceUpdate);
      };
    }
  }, [realtimeUpdates, wsConnected, refetch]);

  const formatNumber = (num: string, decimals: number = 2) => {
    const parsed = parseFloat(num);
    if (parsed === 0) return '0';
    if (parsed < 0.0001) return '<0.0001';
    return parsed.toFixed(decimals);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getProgressPercentage = (soldSupply: string) => {
    const totalSold = parseFloat(soldSupply);
    return calculateProgressFromSupply(totalSold);
  };

  const getExplorerUrl = (address: string) => {
    return `https://bscscan.com/address/${address}`;
  };

  const getCreatorUrl = (address: string) => {
    return `https://bscscan.com/address/${address}`;
  };

  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
  };

  const handleBackToList = () => {
    setSelectedToken(null);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (selectedToken) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToList} className="mb-4">
          ← Back to Token List
        </Button>
        <TradingViewWidget
          symbol={selectedToken.symbol}
          height="h-[600px]"
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Ahiru Launchpad Tokens
                {wsConnected && realtimeUpdates && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Trade tokens on the bonding curve before they graduate to DEX
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={realtimeUpdates ? "default" : "outline"}
                size="sm"
                onClick={() => setRealtimeUpdates(!realtimeUpdates)}
                disabled={!wsConnected}
              >
                <Clock className="h-4 w-4 mr-2" />
                {realtimeUpdates ? "Live" : "Offline"}
              </Button>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens by name or symbol..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filters:</span>
              </div>

              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tokens</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raised">Most Raised</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.order}
                onValueChange={(value) => handleFilterChange('order', value)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isConnected ? (
            <Alert>
              <AlertDescription>
                Please connect your wallet to view and trade tokens
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAndSortedTokens.length === 0 ? (
            <Alert>
              <AlertDescription>
                {searchQuery ? 'No tokens found matching your search.' : 'No tokens have been created yet.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground pb-2">
                <div>Total: {totalCount || filteredAndSortedTokens.length}</div>
                <div>Active: {filteredAndSortedTokens.filter(t => !t.graduated).length}</div>
                <div>Graduated: {filteredAndSortedTokens.filter(t => t.graduated).length}</div>
                <div>Showing: {filteredAndSortedTokens.length}</div>
              </div>

              <div className="grid gap-4">
                {filteredAndSortedTokens.map((token) => (
                  <Card key={token.tokenAddress} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{token.name}</h3>
                            <Badge variant="secondary">{token.symbol}</Badge>
                            {token.graduated && (
                              <Badge variant="default" className="bg-green-500 text-white">
                                Graduated
                              </Badge>
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <span>Creator:</span>
                              <a
                                href={getCreatorUrl(token.creator)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {formatAddress(token.creator)}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Contract:</span>
                              <a
                                href={getExplorerUrl(token.tokenAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {formatAddress(token.tokenAddress)}
                              </a>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Current Price</p>
                              <p className="font-mono text-sm">
                                {formatNumber(token.initialPrice)} BNB
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Total Raised</p>
                              <p className="font-mono text-sm">
                                {formatNumber(token.totalBNB)} BNB
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Sold Supply</p>
                              <p className="font-mono text-sm">
                                {formatNumber(token.soldSupply)} / 800M
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Progress</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getProgressStatus(getProgressPercentage(token.soldSupply)).bgColor}`}
                                    style={{ width: `${getProgressPercentage(token.soldSupply)}%` }}
                                  ></div>
                                </div>
                                <span className={`text-xs ${getProgressStatus(getProgressPercentage(token.soldSupply)).color}`}>
                                  {getProgressPercentage(token.soldSupply).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Button
                            onClick={() => handleTokenSelect(token)}
                            disabled={token.graduated}
                            className="min-w-24"
                          >
                            {token.graduated ? (
                              'Graduated'
                            ) : (
                              <>
                                Trade
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={getExplorerUrl(token.tokenAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};