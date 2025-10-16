import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockCoins, type MockCoin } from '@/data/mockCoins';

// Extended interface for internal use with trending score
interface ExtendedMockCoin extends MockCoin {
  trendingScore?: number;
}

// Type for backend token data
export interface BackendToken {
  address: string;
  name: string;
  symbol: string;
  metadata?: string;
  creator: string;
  soldSupply: string;
  totalBNB: string;
  initialPrice: string;
  graduated: boolean;
  exists: boolean;
}

// Calculate trending score based on multiple metrics
const calculateTrendingScore = (token: BackendToken): number => {
  const soldSupply = parseFloat(token.soldSupply) || 0;
  const totalBNB = parseFloat(token.totalBNB) || 0;
  const currentPrice = parseFloat(token.initialPrice) || 0.0001;

  // Base metrics
  const volumeScore = Math.min(totalBNB * 10, 50); // Volume contribution (max 50 points)
  const supplyScore = Math.min(soldSupply / 1000, 30); // Supply score (max 30 points)
  const priceScore = Math.min(currentPrice * 1000, 20); // Price score (max 20 points)

  // Bonus metrics
  const newTokenBonus = soldSupply < 10000 ? 10 : 0; // Bonus for new tokens
  const activityBonus = totalBNB > 0.1 ? 5 : 0; // Bonus for activity

  return volumeScore + supplyScore + priceScore + newTokenBonus + activityBonus;
};

// Function to convert backend token to MockCoin format
const backendTokenToMockCoin = (token: BackendToken): ExtendedMockCoin => {
  // Use real data from backend where available
  const currentPrice = parseFloat(token.initialPrice) || 0.0001;
  const soldSupply = parseFloat(token.soldSupply) || 0;
  const totalBNB = parseFloat(token.totalBNB) || 0;

  // Calculate market cap based on actual data
  const marketCap = currentPrice * soldSupply;

  // Format market cap appropriately
  let marketCapStr: string;
  if (marketCap < 0.001) {
    marketCapStr = `${(marketCap * 1000000).toFixed(0)}`; // Convert to wei-like display
  } else if (marketCap < 1) {
    marketCapStr = `${(marketCap * 1000).toFixed(2)}K`;
  } else {
    marketCapStr = `${marketCap.toFixed(2)}M`;
  }

  // Calculate progress based on bonding curve (mock logic for now)
  const progress = token.graduated ? 100 : Math.min((soldSupply / 1000000) * 100, 99);

  // Calculate realistic price change based on actual metrics
  const trendingScore = calculateTrendingScore(token);
  const priceChange = Math.min(trendingScore / 5, 25); // Convert score to percentage (max 25%)

  return {
    id: token.address,
    name: token.name,
    ticker: token.symbol,
    image: '', // No image URL from backend yet
    logo: token.symbol, // Use symbol as logo fallback
    contractAddress: token.address,
    contract: token.address,
    marketCap: marketCapStr,
    progress: progress,
    priceChange: parseFloat(priceChange.toFixed(1)), // Realistic price change based on metrics
    bnbCollected: totalBNB.toString(),
    isLive: token.exists,
    // Add trending score for internal sorting
    trendingScore: parseFloat(trendingScore.toFixed(2))
  };
};

export type FilterType = 'all' | 'gainers' | 'new' | 'completed';
export type SortType = 'marketCap' | 'newest' | 'priceChange';

export interface SearchState {
  searchTerm: string;
  activeFilter: FilterType;
  sortBy: SortType;
  filteredProjects: MockCoin[];
  filteredFeaturedCoins: MockCoin[];
  isLoading: boolean;
}

export interface SearchContextType {
  searchState: SearchState;
  setSearchTerm: (term: string) => void;
  setActiveFilter: (filter: FilterType) => void;
  setSortBy: (sort: SortType) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('marketCap');
  const [isLoading, setIsLoading] = useState(false);
  const [backendTokens, setBackendTokens] = useState<MockCoin[]>([]);

  // Listen for token creation events
  useEffect(() => {
    const handleTokenCreated = () => {
      console.log('🔄 Token created event received, refreshing tokens...');
      fetchTokens();
    };

    window.addEventListener('tokenCreated', handleTokenCreated);
    return () => window.removeEventListener('tokenCreated', handleTokenCreated);
  }, []);

  // Fetch tokens from backend API
  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3004/api/tokens');
      if (response.ok) {
        const data = await response.json();
        // Handle different response formats
        let tokensArray = [];

        if (data.success && data.data && data.data.tokens) {
          tokensArray = data.data.tokens;
        } else if (data.tokens) {
          tokensArray = data.tokens;
        } else if (Array.isArray(data)) {
          tokensArray = data;
        }

        if (tokensArray.length > 0) {
          const convertedTokens = tokensArray.map(backendTokenToMockCoin);
          setBackendTokens(convertedTokens);
          console.log('🔄 Backend tokens loaded:', convertedTokens);
        }
      }
    } catch (error) {
      console.error('Error fetching tokens from backend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTokens();
  }, []); // Fetch once on mount

  // Filter and search logic
  const filterAndSearchProjects = (coins: MockCoin[], term: string, filter: FilterType): MockCoin[] => {
    let filtered = [...coins];

    // Apply search filter
    if (term.trim()) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(coin =>
        coin.name.toLowerCase().includes(lowerTerm) ||
        coin.ticker.toLowerCase().includes(lowerTerm)
      );
    }

    // Apply category filter
    switch (filter) {
      case 'gainers':
        filtered = filtered.filter(coin => coin.priceChange > 0);
        break;
      case 'new':
        filtered = filtered.filter(coin => coin.progress < 50);
        break;
      case 'completed':
        filtered = filtered.filter(coin => coin.progress >= 100);
        break;
      // 'all' doesn't filter anything
    }

    return filtered;
  };

  const filterAndSearchFeaturedCoins = (coins: MockCoin[], term: string): MockCoin[] => {
    let filtered = [...coins];

    // Apply search filter
    if (term.trim()) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(coin =>
        coin.name.toLowerCase().includes(lowerTerm) ||
        coin.ticker.toLowerCase().includes(lowerTerm)
      );
    }

    return filtered;
  };

  // Sort logic
  const sortProjects = (coins: MockCoin[], sortBy: SortType): MockCoin[] => {
    const sorted = [...coins];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.progress - a.progress);
      case 'marketCap':
        return sorted.sort((a, b) => {
          const aCap = parseFloat(a.marketCap.replace(/[^0-9.]/g, ''));
          const bCap = parseFloat(b.marketCap.replace(/[^0-9.]/g, ''));
          return bCap - aCap;
        });
      case 'priceChange':
        return sorted.sort((a, b) => b.priceChange - a.priceChange);
      default:
        return sorted;
    }
  };

  const sortFeaturedCoins = (coins: MockCoin[], sortBy: SortType): MockCoin[] => {
    const sorted = [...coins];

    switch (sortBy) {
      case 'newest':
        return sorted; // All featured coins are completed
      case 'marketCap':
        return sorted.sort((a, b) => {
          const aCap = parseFloat(a.marketCap.replace(/[^0-9.]/g, ''));
          const bCap = parseFloat(b.marketCap.replace(/[^0-9.]/g, ''));
          return bCap - aCap;
        });
      case 'priceChange':
        return sorted.sort((a, b) => b.priceChange - a.priceChange);
      default:
        return sorted;
    }
  };

  // Calculate filtered and sorted results

  // Separate into trending projects and featured coins - NO DUPLICATIONS
  // ALL tokens (backend + static) are processed through same logic based on progress/trending criteria

  // 1. Combine all tokens (backend + static) for unified processing
  const allTokens = [...backendTokens, ...mockCoins].filter(coin => coin.isLive);

  // 2. Deduplicate by contract address (ensure 1 data = 1 informasi)
  const uniqueTokens = allTokens.filter((token, index, self) =>
    index === self.findIndex(t =>
      (t.contractAddress || t.contract) === (token.contractAddress || token.contract)
    )
  );

  // 3. Split based on criteria:
  // - Featured: Progress < 50% OR trending score < 30 (new/not trending yet)
  // - Trending: Progress >= 50% AND trending score >= 30 (established/trending)
  const featuredCoins = uniqueTokens.filter(coin =>
    coin.progress < 50 || (coin.trendingScore !== undefined && coin.trendingScore < 30)
  );

  const hotProjects = uniqueTokens.filter(coin =>
    coin.progress >= 50 && (coin.trendingScore !== undefined && coin.trendingScore >= 30)
  );

  // 4. Fallback logic - ensure we always have data but NO DUPLICATIONS
  const finalHotProjects = hotProjects.length > 0 ? hotProjects : uniqueTokens.slice(0, 6);
  const finalFeaturedCoins = featuredCoins.length > 0 ? featuredCoins : uniqueTokens.slice(6, 14);

  const filteredProjects = sortProjects(
    filterAndSearchProjects(finalHotProjects, searchTerm, activeFilter),
    sortBy
  );

  const filteredFeaturedCoins = sortFeaturedCoins(
    filterAndSearchFeaturedCoins(finalFeaturedCoins, searchTerm),
    sortBy
  );

  const searchState: SearchState = {
    searchTerm,
    activeFilter,
    sortBy,
    filteredProjects,
    filteredFeaturedCoins,
    isLoading,
  };

  const clearSearch = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setSortBy('marketCap');
  };

  const value: SearchContextType = {
    searchState,
    setSearchTerm,
    setActiveFilter,
    setSortBy,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};