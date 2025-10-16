import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useSearch } from "@/contexts/SearchContext";
import {
  ArrowUpDown, ShieldCheck, ArrowLeft, Wifi, WifiOff, Activity, RefreshCw, AlertCircle, Loader2,
  Share2, Twitter, MessageCircle, Heart, Bookmark, TrendingUp, TrendingDown, BarChart3,
  Wallet, ExternalLink, Copy, Check, Users, Globe, Zap, Eye, Clock, DollarSign,
  ChevronUp, ChevronDown, Star, Bell, Settings, Info
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTokenIntegration } from "@/hooks/useTokenIntegration";
import {
  PriceChangeAnimation,
  AnimatedTradeButton,
  TabTransition
} from "@/components/AnimatedTransition";
import { ErrorBoundary, useErrorHandler, ErrorDisplay } from "@/components/ErrorBoundary";
import { useToast } from "@/components/Toast";
import TradingViewSkeleton from "@/components/TradingViewSkeleton";
import type { TokenInfo } from '@/types/api';
import { BONDING_CURVE_CONFIG, calculateBondingCurveProgress, getBondingCurveState } from '@/utils/bondingCurve';

// Lazy load components
const TradingViewWidget = lazy(() => import("@/components/TradingViewWidget"));
const CommentsSection = lazy(() => import("@/components/CommentsSection"));
const TradesSection = lazy(() => import("@/components/TradesSection"));
const HoldersSidebar = lazy(() => import("@/components/HoldersSidebar"));

const TokenDetail = () => {
  const { contractAddress } = useParams<{ contractAddress: string }>();

  console.log('🔍 TokenDetail Page Loaded!');
  console.log('🔍 TokenDetail - contractAddress from URL:', contractAddress);
  console.log('🔍 TokenDetail - Full URL params:', useParams());

  // Validate contract address format
  if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid Contract Address</h2>
          <p className="text-muted-foreground mb-6">
            The contract address format is invalid. Please check the URL and try again.
          </p>
          <Link to="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const { success, error } = useToast();

  // Use the enhanced token integration hook
  const {
    token,
    analytics,
    loading,
    error: integrationError,
    isOnline,
    isConnected,
    refresh,
    buyToken,
    sellToken,
    subscribeToUpdates,
    transactions,
    recentTransactions
  } = useTokenIntegration({
    tokenAddress: contractAddress,
    enableRealtime: true,
    enableCaching: true,
    autoRefresh: true,
    refreshInterval: 30000 // 30 seconds
  });

  // Local state
  const [tradingError, setTradingError] = useState<string | null>(null);
  const [isPriceUpdating, setIsPriceUpdating] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"comments" | "trades">("trades");
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [showSocialShare, setShowSocialShare] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<string>("0.0000");
  const [showWalletDropdown, setShowWalletDropdown] = useState<boolean>(false);

  // Trade panel states
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [fromToken, setFromToken] = useState<string>("BNB");
  const [toToken, setToToken] = useState<string>("TOKEN");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1.0);
  const [customSlip, setCustomSlip] = useState<string>("");
  const [mevProtection, setMevProtection] = useState<boolean>(true);

  // Mock holders list for sidebar display
  const holders = useMemo(() => {
    return [
      { address: "0x1234...5678", amount: "1,234,567", percentage: 12.5 },
      { address: "0x8765...4321", amount: "987,654", percentage: 10.0 },
      { address: "0x2468...1357", amount: "765,432", percentage: 7.8 },
      { address: "0x9753...2468", amount: "654,321", percentage: 6.6 },
      { address: "0x3697...9876", amount: "543,210", percentage: 5.5 }
    ];
  }, []);

  // Get token from search context if available
  const { searchState } = useSearch();

  // Search in all possible places: featured coins, hot projects, and combined data
  console.log('🔍 TokenDetail - Debug searchState:', {
    filteredFeaturedCoins: searchState.filteredFeaturedCoins,
    filteredProjects: searchState.filteredProjects,
    contractAddress
  });

  const contextToken = [
    ...searchState.filteredFeaturedCoins,
    ...searchState.filteredProjects
  ].find((c) =>
    c.contractAddress?.toLowerCase() === contractAddress?.toLowerCase() ||
    c.contract?.toLowerCase() === contractAddress?.toLowerCase()
  );

  console.log('🔍 TokenDetail - contextToken found:', contextToken);

  // If no token found in context, try to find matching token by partial address
  const findTokenByPartialAddress = (address: string) => {
    const allTokens = [
      ...searchState.filteredFeaturedCoins,
      ...searchState.filteredProjects
    ];

    // Try to find token by matching partial address or similar pattern
    return allTokens.find(token => {
      if (!token.contractAddress && !token.contract) return false;
      const tokenAddress = token.contractAddress || token.contract;
      if (!tokenAddress) return false;

      // Check if the address contains the same pattern (first 8 chars)
      const addressPart = address.slice(0, 8).toLowerCase();
      const tokenAddressPart = tokenAddress.slice(0, 8).toLowerCase();

      return addressPart === tokenAddressPart;
    });
  };

  const foundToken = !contextToken ? findTokenByPartialAddress(contractAddress) : contextToken;

  // If still no token found, create a mock token based on the contract address
  const createMockTokenFromAddress = (address: string) => {
    // Generate a deterministic name/ticker from the address with fallbacks
    let name: string;
    let ticker: string;

    if (address && address.length >= 6) {
      // Extract meaningful part of address for name (skip "0x")
      const meaningfulPart = address.slice(2, 6);
      // Use first 3 chars for ticker if available
      const tickerPart = address.slice(2, 5);

      name = `Token ${meaningfulPart.toUpperCase()}`;
      ticker = tickerPart.toUpperCase();
    } else {
      // Fallback for invalid/empty addresses
      name = "New Token";
      ticker = "NEW";
    }

    // Ensure ticker is not just zeros
    if (ticker === "000" || ticker === "00" || ticker === "0") {
      ticker = "NEW";
    }

    return {
      name,
      symbol: ticker,
      ticker,
      address: address || "0x0000000000000000000000000000000000000000",
      contractAddress: address || "0x0000000000000000000000000000000000000000",
      contract: address || "0x0000000000000000000000000000000000000000",
      logo: ticker,
      marketCap: "$0",
      progress: 0,
      priceChange: 0,
      bnbCollected: "0",
      isLive: true
    };
  };

  const mockToken = !foundToken ? createMockTokenFromAddress(contractAddress) : null;
  console.log('🔍 TokenDetail - mockToken created:', mockToken);

  // Use token from integration hook, fallback to found token, then to mock, then to null
  const displayToken = token || foundToken || mockToken || null;

  // Helper function to get symbol/ticker from either TokenInfo or MockCoin
  const getTokenSymbol = useCallback((token: any) => {
    if (!token) return "TOKEN";
    return 'symbol' in token ? (token.symbol || "TOKEN") : (token.ticker || "TOKEN");
  }, []);

  // Helper function to get logo from either TokenInfo or MockCoin
  const getTokenLogo = useCallback((token: any) => {
    if (!token) return '🪙';
    return 'logo' in token ? (token.logo || '🪙') : '🪙';
  }, []);

  
  // Convert Transaction to Trade format for TradesSection component
  const convertTransactionsToTrades = useCallback((transactions: any[]): any[] => {
    if (!transactions || !Array.isArray(transactions)) return [];

    return transactions.map(tx => ({
      account: tx.from || tx.user || '0x0000...0000',
      amountBNB: tx.amountBNB || tx.value || '0',
      amountToken: tx.amountToken || tx.amount || '0',
      time: tx.timestamp || tx.time || Date.now(),
      txn: tx.hash || tx.txn || tx.transactionHash || '',
      type: tx.type || 'unknown'
    }));
  }, []);

  // Real-time updates subscription
  useEffect(() => {
    if (!displayToken) return;

    const unsubscribe = subscribeToUpdates((data: any) => {
      console.log('Real-time update received:', data);
      setLastUpdateTime(new Date());

      // Handle price updates
      if (data.type === 'price_update') {
        setIsPriceUpdating(true);
        setTimeout(() => setIsPriceUpdating(false), 1000);
      }

      // Handle trading updates
      if (data.type === 'trade_executed') {
        toast.success(`Trade executed: ${data.amount} ${data.token}`);
      }

      // Handle analytics updates
      if (data.type === 'analytics_update') {
        toast.info('Analytics updated');
      }
    });

    return unsubscribe;
  }, [displayToken, subscribeToUpdates]);

  // Update token name based on integration data
  useEffect(() => {
    if (displayToken) {
      const symbol = 'symbol' in displayToken ? displayToken.symbol : displayToken.ticker;
      setToToken(symbol || "TOKEN");
    }
  }, [displayToken]);

  // Handle buy/sell actions through integration hook
  const handleBuy = useCallback(async () => {
    if (!fromAmount) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      await buyToken(fromAmount);
      setFromAmount("");
      setToAmount("");
    } catch (error: any) {
      console.error('Buy failed:', error);
      toast.error(error.message || 'Buy failed');
    }
  }, [fromAmount, buyToken]);

  const handleSell = useCallback(async () => {
    if (!fromAmount) {
      toast.error('Please enter an amount');
      return;
    }

    try {
      await sellToken(fromAmount);
      setFromAmount("");
      setToAmount("");
    } catch (error: any) {
      console.error('Sell failed:', error);
      toast.error(error.message || 'Sell failed');
    }
  }, [fromAmount, sellToken]);

  // Wallet connection (simplified)
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      const eth = (window as Window & { ethereum?: unknown })?.ethereum;
      if (!eth) {
        toast.error("MetaMask not detected");
        return;
      }
      const accounts: string[] = await (eth as { request: (args: { method: string }) => Promise<string[]> }).request({ method: "eth_requestAccounts" });
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        localStorage.setItem("mm_connected", "1");
        localStorage.setItem("mm_address", accounts[0]);
        toast.success(`Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      }
    } catch (e: unknown) {
      const errorToHandle = e instanceof Error ? e : new Error(String(e));
      const errorMessage = handleError(errorToHandle, "wallet_connection");
      setTradingError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [handleError]);

  // TradingView symbol based on symbol
  const tvSymbol = useMemo(() => {
    const symbol = getTokenSymbol(displayToken).toUpperCase();
    return `BINANCE:${symbol}USDT`;
  }, [displayToken, getTokenSymbol]);

  // Social media sharing functions
  const shareOnTwitter = useCallback(() => {
    const price = analytics?.currentPrice || 0;
    const marketCap = ('market_cap' in displayToken ? displayToken.market_cap : null) ||
                     ('marketCap' in displayToken ? displayToken.marketCap : null) ||
                     analytics?.marketCap || 0;
    const parseMarketCap = (cap: string | number) => {
      if (typeof cap === 'number') return cap;
      const numValue = parseFloat(cap.toString().replace(/[^0-9.]/g, ''));
      return numValue || 0;
    };

    // Convert BNB price to USD (assuming 1 BNB = $300)
    const bnbToUsdRate = 300;
    const priceInUSD = price * bnbToUsdRate;

    const text = `Check out ${displayToken.name} (${getTokenSymbol(displayToken)}) - Price: $${priceInUSD.toFixed(6)} | Market Cap: $${parseMarketCap(marketCap).toLocaleString()} 🚀`;
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  }, [displayToken, analytics, getTokenSymbol]);

  const shareOnTelegram = useCallback(() => {
    const price = analytics?.currentPrice || 0;
    const marketCap = ('market_cap' in displayToken ? displayToken.market_cap : null) ||
                     ('marketCap' in displayToken ? displayToken.marketCap : null) ||
                     analytics?.marketCap || 0;
    const parseMarketCap = (cap: string | number) => {
      if (typeof cap === 'number') return cap;
      const numValue = parseFloat(cap.toString().replace(/[^0-9.]/g, ''));
      return numValue || 0;
    };

    // Convert BNB price to USD (assuming 1 BNB = $300)
    const bnbToUsdRate = 300;
    const priceInUSD = price * bnbToUsdRate;

    const text = `🚀 ${displayToken.name} (${getTokenSymbol(displayToken)})\n💰 Price: $${priceInUSD.toFixed(6)}\n📊 Market Cap: $${parseMarketCap(marketCap).toLocaleString()}\n🔗 ${window.location.href}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  }, [displayToken, analytics, getTokenSymbol]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Share link copied!');
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    toast.success(isLiked ? 'Removed from likes' : 'Added to likes');
  }, [isLiked]);

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  }, [isBookmarked]);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedAddress(true);
    toast.success('Contract address copied!');
    setTimeout(() => setCopiedAddress(false), 2000);
  }, [contractAddress]);

  // Wallet functions
  const disconnectWallet = useCallback(() => {
    setWalletAddress("");
    localStorage.removeItem("mm_connected");
    localStorage.removeItem("mm_address");
    setShowWalletDropdown(false);
    toast.success("Wallet disconnected");
  }, []);

  const switchWallet = useCallback(() => {
    // Implement wallet switching logic
    toast.info("Switching wallet...");
    disconnectWallet();
    setTimeout(() => connectWallet(), 1000);
  }, [connectWallet, disconnectWallet]);

  // Error display
  if (tradingError || integrationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorDisplay
          error={tradingError || integrationError || 'Unknown error'}
          onDismiss={() => {
            setTradingError(null);
          }}
          variant="card"
        />
      </div>
    );
  }

  // Loading state
  if (loading && !displayToken) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Mobile Header Skeleton */}
          <div className="lg:hidden mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2 w-20" />
                  <div className="h-6 bg-muted rounded animate-pulse w-32" />
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="h-8 bg-muted rounded animate-pulse mx-auto w-32 mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse mx-auto w-16" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Desktop Skeleton */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 space-y-4">
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="h-6 bg-muted rounded animate-pulse w-48 mb-4" />
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Token Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The token you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Get price from analytics or fallback
  const currentPrice = analytics?.currentPrice || 0;
  const priceChange = analytics?.priceChange || ('priceChange' in displayToken ? displayToken.priceChange : 0);

  // Convert BNB price to USD for display (assuming 1 BNB = $300)
  const bnbToUsdRate = 300;
  const currentPriceInUSD = currentPrice * bnbToUsdRate;

  // Get market cap from token data or analytics - prioritize token data for consistency
  const marketCap = ('market_cap' in displayToken ? displayToken.market_cap : null) ||
                   ('marketCap' in displayToken ? displayToken.marketCap : null) ||
                   analytics?.marketCap || 0;

  // Parse market cap to number for display
  const parseMarketCap = (cap: string | number) => {
    if (typeof cap === 'number') return cap;
    const numValue = parseFloat(cap.toString().replace(/[^0-9.]/g, ''));
    return numValue || 0;
  };

  // Format number to K/M notation
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  // Mock trades data for demonstration
  const mockTrades = [
    {
      account: "0x1234567890abcdef1234567890abcdef12345678",
      type: "BUY" as const,
      amountBNB: "0.123",
      amountToken: "1234.567",
      time: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      txn: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    },
    {
      account: "0x9876543210fedcba9876543210fedcba98765432",
      type: "SELL" as const,
      amountBNB: "0.456",
      amountToken: "4567.890",
      time: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      txn: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"
    },
    {
      account: "0xabcdef1234567890abcdef1234567890abcdef12",
      type: "BUY" as const,
      amountBNB: "0.789",
      amountToken: "7890.123",
      time: Date.now() - 1000 * 60 * 15, // 15 minutes ago
      txn: "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
    },
    {
      account: "0x5678901234cdef5678901234cdef5678901234cd",
      type: "SELL" as const,
      amountBNB: "0.234",
      amountToken: "2345.678",
      time: Date.now() - 1000 * 60 * 20, // 20 minutes ago
      txn: "0xcdef5678901234cdef5678901234cdef5678901234cdef5678901234cdef5678"
    },
    {
      account: "0x3456789012bcde3456789012bcde3456789012bc",
      type: "BUY" as const,
      amountBNB: "0.567",
      amountToken: "5678.901",
      time: Date.now() - 1000 * 60 * 25, // 25 minutes ago
      txn: "0xbcde3456789012bcde3456789012bcde3456789012bcde3456789012bcde3456"
    }
  ];

  // Convert transactions to trades format for TradesSection
  const tradesData = convertTransactionsToTrades(transactions || recentTransactions || mockTrades);

  
  
  // Convert holders to proper format for HoldersSidebar
  const holdersData = holders.map(holder => ({
    label: holder.address,
    percent: holder.percentage
  }));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col min-h-screen">
          {/* Mobile Header */}
          <header className="lg:hidden bg-card border-b border-border px-4 py-3 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              </div>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-none w-full">
            {/* Desktop Status Bar */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      isLiked
                        ? 'bg-primary/20 border-primary/30 text-primary'
                        : 'border-border bg-card hover:bg-muted text-foreground'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowSocialShare(!showSocialShare)}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border bg-card hover:bg-muted transition-colors text-foreground"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                    {showSocialShare && (
                      <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-md shadow-lg p-1 z-50 min-w-[140px]">
                        <button
                          onClick={shareOnTwitter}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors text-left"
                        >
                          <Twitter className="w-3 h-3 text-blue-500" />
                          Twitter
                        </button>
                        <button
                          onClick={shareOnTelegram}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors text-left"
                        >
                          <MessageCircle className="w-3 h-3 text-blue-400" />
                          Telegram
                        </button>
                        <button
                          onClick={copyShareLink}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors text-left"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Token Header */}
            <div className="lg:hidden mb-6">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                    {getTokenLogo(displayToken)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-primary text-sm font-semibold mb-1">{getTokenSymbol(displayToken)}</div>
                    <h1 className="text-lg font-bold text-foreground leading-tight capitalize truncate">{displayToken.name}</h1>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PriceChangeAnimation priceChange={priceChange}>
                      <div className="text-foreground font-bold text-xl animate-fade-in">
                        ${currentPriceInUSD.toFixed(6)}
                      </div>
                    </PriceChangeAnimation>
                    {isPriceUpdating && (
                      <div className="animate-spin">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className={`text-sm ${priceChange >= 0 ? 'text-green-500 price-up' : 'text-red-500 price-down'} transition-smooth font-medium`}>
                    {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 animate-fade-in">
                    MC: {formatNumber(parseMarketCap(marketCap))} | Vol: {formatNumber((analytics?.volume24h ? analytics.volume24h * bnbToUsdRate : 0))}
                  </div>
                </div>

                {/* Quick Actions - Mobile */}
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      document.getElementById('trading-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full"
                  >
                    Trade Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 space-y-6">
                  {/* Token Header */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-2xl">
                          {getTokenLogo(displayToken)}
                        </div>
                        <div>
                          <div className="text-primary text-sm font-semibold">{getTokenSymbol(displayToken)}</div>
                          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight capitalize">{displayToken.name}</h1>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PriceChangeAnimation priceChange={priceChange}>
                            <div className="text-foreground font-bold text-xl animate-fade-in">
                              ${currentPriceInUSD.toFixed(6)}
                            </div>
                          </PriceChangeAnimation>
                          {isPriceUpdating && (
                            <div className="animate-spin">
                              <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className={`text-xs ${priceChange >= 0 ? 'text-green-500 price-up' : 'text-red-500 price-down'} transition-smooth`}>
                          {priceChange.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 animate-fade-in">
                          MC: {formatNumber(parseMarketCap(marketCap))} | Vol: {formatNumber((analytics?.volume24h ? analytics.volume24h * bnbToUsdRate : 0))}
                        </div>
                      </div>
                    </div>
                  </div>

  
                  {/* TradingView embed - Lazy loaded */}
                  <Suspense fallback={<TradingViewSkeleton />}>
                    <TradingViewWidget symbol={tvSymbol} />
                  </Suspense>

                  {/* Analytics Dashboard */}
                  <div className="rounded-xl border border-border bg-card p-4">

                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">24h Volume</p>
                          <p className="text-lg font-bold">
                            {formatNumber((analytics?.volume24h ? analytics.volume24h * bnbToUsdRate : 0))}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                          <p className="text-lg font-bold">
                            {formatNumber((analytics?.marketCap || 0))}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">ATH Price</p>
                          <p className="text-lg font-bold">
                            {formatNumber((analytics?.athPrice ? analytics.athPrice * bnbToUsdRate : 0))}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">24h Change</p>
                          <p className={`text-lg font-bold ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tabs Card: Comments / Trades */}
                  <div className="rounded-xl border border-border bg-card flex flex-col min-h-[600px]">
                    <div className="flex items-center gap-8 px-4 py-3 border-b border-border flex-shrink-0">
                      <button
                        onClick={() => setActiveTab("comments")}
                        className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab==='comments' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Comments
                        {activeTab==='comments' && (
                          <span className="absolute -bottom-3 left-0 h-0.5 w-full bg-primary" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("trades")}
                        className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab==='trades' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Trades
                        {activeTab==='trades' && (
                          <span className="absolute -bottom-3 left-0 h-0.5 w-full bg-primary" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      {/* CONTENT SWITCH */}
                      <TabTransition isActive={true}>
                        {activeTab === 'trades' && (
                          <Suspense fallback={
                            <div className="flex items-center justify-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          }>
                            <TradesSection
                              trades={tradesData}
                              visible={tradesData?.slice(0, 10)}
                              sortKey={"time"}
                              sortDir={"desc"}
                              pageSafe={1}
                              totalPages={Math.ceil((tradesData?.length || 0) / 10)}
                              toggleSort={() => {}}
                              setPage={() => {}}
                              coinTicker={getTokenSymbol(displayToken)}
                            />
                          </Suspense>
                        )}

                        {activeTab === 'comments' && (
                          <Suspense fallback={
                            <div className="flex items-center justify-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          }>
                            <CommentsSection />
                          </Suspense>
                        )}
                      </TabTransition>
                    </div>
                  </div>
                </div>

                {/* Desktop Sidebar */}
                <aside className="col-span-4 space-y-4">
                  <div className="sticky top-6 space-y-4">
                    {/* Panel Buy/Sell - Desktop */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
                          <button
                            onClick={() => setTradeMode("buy")}
                            className={`px-4 py-2 rounded-md font-bold text-sm ${
                              tradeMode === "buy"
                                ? "bg-green-500 text-white shadow-lg"
                                : "text-muted-foreground hover:text-foreground hover:bg-green-500/10"
                            }`}
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => setTradeMode("sell")}
                            className={`px-4 py-2 rounded-md font-bold text-sm ${
                              tradeMode === "sell"
                                ? "bg-red-500 text-white shadow-lg"
                                : "text-muted-foreground hover:text-foreground hover:bg-red-500/10"
                            }`}
                          >
                            Sell
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tradeMode === "buy" ? "Buying" : "Selling"} {fromToken}
                        </div>
                      </div>

                      {/* From input */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span>From</span>
                          <span className="text-foreground/70">
                            Balance: {fromToken === "BNB" ? "5.2" : "0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
                          <button className="px-2 py-1 rounded-md border border-border bg-card text-xs">
                            {fromToken}
                          </button>
                          <input
                            inputMode="decimal"
                            value={fromAmount}
                            onChange={(e) => setFromAmount(e.target.value)}
                            placeholder="0.0"
                            className="flex-1 bg-transparent outline-none text-right text-sm"
                          />
                        </div>
                      </div>

                      {/* Swap button */}
                      <div className="flex justify-center my-2">
                        <button
                          type="button"
                          onClick={() => {
                            const temp = fromToken;
                            setFromToken(toToken);
                            setToToken(temp);
                          }}
                          className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted/40"
                        >
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      {/* To input */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span>To</span>
                          <span className="text-foreground/70">Est.</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
                          <button className="px-2 py-1 rounded-md border border-border bg-card text-xs">
                            {toToken}
                          </button>
                          <input
                            inputMode="decimal"
                            value={toAmount}
                            readOnly
                            placeholder="0.0"
                            className="flex-1 bg-transparent outline-none text-right text-sm"
                          />
                        </div>
                      </div>

                      {/* Slippage selector */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                          <span>Slippage</span>
                          <span className="text-foreground/70">{slippage}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {[0.5, 1.0, 2.0, 5.0].map((s) => (
                            <button
                              key={s}
                              onClick={() => { setSlippage(s); setCustomSlip(""); }}
                              className={`px-3 py-1 rounded-md border text-xs ${
                                slippage === s && !customSlip ? 'bg-muted/50 border-border' : 'bg-card border-border hover:bg-muted/40'
                              }`}
                            >
                              {s}%
                            </button>
                          ))}
                          <div className="flex items-center gap-2">
                            <input
                              value={customSlip}
                              onChange={(e) => setCustomSlip(e.target.value)}
                              placeholder="Custom %"
                              className="w-24 px-2 py-1 rounded-md border border-border bg-background text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* MEV protection */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                          <span>MEV Protection</span>
                        </div>
                        <button
                          onClick={() => setMevProtection(v => !v)}
                          className={`h-5 w-9 rounded-full relative transition-colors ${
                            mevProtection ? 'bg-green-500/70' : 'bg-muted/50'
                          }`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                            mevProtection ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Action Button */}
                      <AnimatedTradeButton
                        variant={!walletAddress ? "connect" : tradeMode === "buy" ? "buy" : "sell"}
                        isLoading={isConnecting}
                        onClick={async () => {
                          if (!walletAddress) {
                            await connectWallet();
                          } else if (tradeMode === "buy") {
                            await handleBuy();
                          } else {
                            await handleSell();
                          }
                        }}
                      >
                        {!walletAddress
                          ? 'Connect Wallet'
                          : tradeMode === "buy"
                          ? "Buy"
                          : "Sell"
                        }
                      </AnimatedTradeButton>

                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Network: {!walletAddress ? '-' : 'BSC'}
                      </div>
                    </div>

                    {/* Bonding Progress */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Bonding Progress</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${('progress' in displayToken ? displayToken.progress : 60)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {'progress' in displayToken ? displayToken.progress : 60}%
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          const progress = 'progress' in displayToken ? displayToken.progress : 60;
                          const currentAmount = (progress / 100) * BONDING_CURVE_CONFIG.GROSS_RAISE;
                          return `${currentAmount.toFixed(1)} BNB in bonding curve`;
                        })()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {BONDING_CURVE_CONFIG.GROSS_RAISE} BNB to graduate
                      </span>
                    </div>
                    </div>

                    {/* Holders Sidebar - Lazy loaded */}
                    <Suspense
                      fallback={
                        <div className="rounded-xl border border-border bg-card p-4">
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      }
                    >
                      <HoldersSidebar
                        holders={holdersData}
                        coinName={displayToken.name}
                        coinTicker={getTokenSymbol(displayToken)}
                        coinLogo={getTokenLogo(displayToken)}
                        contractAddress={contractAddress}
                      />
                    </Suspense>
                  </div>
                </aside>
              </div>
            </div>

            {/* Mobile Content */}
            <div className="lg:hidden space-y-6">
  
  
              {/* Mobile Analytics */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Analytics
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">24h Volume</p>
                      <p className="font-semibold text-sm mt-1">
                        {formatNumber((analytics?.volume24h ? analytics.volume24h * bnbToUsdRate : 0))}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Market Cap</p>
                      <p className="font-semibold text-sm mt-1">
                        {formatNumber((analytics?.marketCap || 0))}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">ATH Price</p>
                      <p className="font-semibold text-sm mt-1">
                        {formatNumber((analytics?.athPrice ? analytics.athPrice * bnbToUsdRate : 0))}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">24h Change</p>
                      <p className={`font-semibold text-sm mt-1 ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile TradingView */}
              <Suspense fallback={<TradingViewSkeleton />}>
                <TradingViewWidget symbol={tvSymbol} />
              </Suspense>

              {/* Mobile Tabs */}
              <div className="bg-card rounded-xl border border-border">
                <div className="flex items-center border-b border-border">
                  <button
                    onClick={() => setActiveTab("trades")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "trades"
                        ? "text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Trades
                  </button>
                  <button
                    onClick={() => setActiveTab("comments")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "comments"
                        ? "text-foreground border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Comments
                  </button>
                </div>

                <div className="min-h-[400px]">
                  {activeTab === 'trades' && (
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    }>
                      <TradesSection
                        trades={tradesData}
                        visible={tradesData?.slice(0, 10)}
                        sortKey={"time"}
                        sortDir={"desc"}
                        pageSafe={1}
                        totalPages={Math.ceil((tradesData?.length || 0) / 10)}
                        toggleSort={() => {}}
                        setPage={() => {}}
                        coinTicker={getTokenSymbol(displayToken)}
                      />
                    </Suspense>
                  )}

                  {activeTab === 'comments' && (
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    }>
                      <CommentsSection />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TokenDetail;