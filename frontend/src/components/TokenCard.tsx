import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Heart } from "lucide-react";
import { MockCoin } from "@/data/mockCoins";
import { LazyImage } from "./LazyImage";

interface TokenCardProps {
  token: MockCoin;
}

// Function to generate unique placeholder image based on token name
const getPlaceholderImage = (name: string, ticker: string) => {
  // Use a hash of the name to generate consistent images
  const seed = `${name}-${ticker}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://picsum.photos/seed/${seed}/200/200.jpg`;
};

export const TokenCard = ({ token }: TokenCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = async () => {
    // Validate contract address before navigation
    let contractAddress = token.contractAddress || token.contract;

    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      // Generate a deterministic valid address based on token data
      const seed = `${token.name}-${token.ticker}`;
      const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      contractAddress = `0x${hash.toString(16).padStart(40, '0').slice(0, 40)}`;
      console.log('⚠️ Generated deterministic contract address:', contractAddress);
    }

    console.log('🔄 Navigating to token detail:', contractAddress);
    console.log('🔄 Token data:', token);
    console.log('🔄 Navigate path:', `/token/${contractAddress}`);

    setIsNavigating(true);

    try {
      // Use window.location.href as fallback if navigate fails
      navigate(`/token/${contractAddress}`);
      console.log('✅ Navigation initiated successfully');

      // Wait a bit to see if navigation works
      setTimeout(() => {
        if (window.location.pathname === '/') {
          console.log('🔄 Navigation didn\'t work, using fallback');
          window.location.href = `/token/${contractAddress}`;
        }
      }, 100);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to direct navigation
      window.location.href = `/token/${contractAddress}`;
    }
  };

  const formatMarketCap = (cap: string) => {
    const numValue = parseFloat(cap.replace(/[^0-9.]/g, ''));
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(1)}K`;
    }
    return `$${numValue.toFixed(0)}`;
  };

  const calculateMarketCap = (token: MockCoin) => {
    // SmartContract formula: marketCap = currentPrice * soldSupply / 1e18
    // But using realistic values for display

    // Use progress to determine sold amount in BNB (more realistic)
    const raisedInBNB = (token.progress || 25) / 100 * 35; // Max 35 BNB target
    const soldSupply = (token.progress || 25) * 200_000_000; // Max 200M tokens sold

    // Current price in BNB (exponential bonding curve)
    const INITIAL_PRICE = 0.00001; // 0.00001 BNB from smart contract
    const priceIncrease = Math.pow(2.718, (5.43 * (soldSupply / 1_000_000_000)));
    const currentPriceBNB = INITIAL_PRICE * priceIncrease;

    // Market cap in BNB (current price × total supply that will be sold)
    const marketCapBNB = currentPriceBNB * soldSupply;

    // Convert to USD (assuming $1000 BNB)
    const marketCapUSD = marketCapBNB * 1000;

    // Use raised amount as minimum market cap (more realistic)
    return Math.max(raisedInBNB * 1000, marketCapUSD);
  };

  const getTimeAgo = (createdAt?: string) => {
    if (!createdAt || createdAt === "Invalid Date") return "Just now";

    try {
      const created = new Date(createdAt);
      const now = new Date();

      // Check if date is valid
      if (isNaN(created.getTime())) {
        console.warn('Invalid date:', createdAt);
        return "1d ago";
      }

      const diffMs = now.getTime() - created.getTime();

      // Check if difference is valid
      if (isNaN(diffMs) || diffMs < 0) {
        console.warn('Invalid time difference:', diffMs, createdAt);
        return "1d ago";
      }

      // Convert to different time units
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return diffSeconds <= 1 ? "Just now" : `${diffSeconds}s ago`;
      } else if (diffMinutes < 60) {
        return diffMinutes === 1 ? "1m ago" : `${diffMinutes}m ago`;
      } else if (diffHours < 24) {
        return diffHours === 1 ? "1h ago" : `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return diffDays === 1 ? "1d ago" : `${diffDays}d ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? "1w ago" : `${weeks}w ago`;
      } else {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? "1mo ago" : `${months}mo ago`;
      }
    } catch (error) {
      console.error('Error calculating time ago:', error, createdAt);
      return "1d ago";
    }
  };

  const getBondingProgress = () => {
    // Use actual bonding progress from token data if available
    if (token.progress !== undefined) {
      return token.progress;
    }
    // Fallback to reasonable default if not provided
    return 25; // Default to 25% for new tokens
  };

  
  return (
    <div
      onClick={handleClick}
      className={`relative flex bg-card text-card-foreground rounded-xl sm:rounded-2xl p-4 sm:p-6 gap-4 sm:gap-6 items-center hover:bg-background transition-all duration-300 cursor-pointer w-full min-w-0 sm:min-w-[500px] border border-black ${
        isHovered ? 'shadow-lg shadow-black/20 transform -translate-y-1' : ''
      } ${
        isNavigating ? 'opacity-75 scale-95' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Favorite Button */}
      <button
        className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-input/80 backdrop-blur-sm border border-black hover:bg-card transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsFavorited(!isFavorited);
        }}
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors duration-200 ${
            isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
          }`}
        />
      </button>

      {/* Logo Area */}
      <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 bg-input border border-black">
        <LazyImage
          src={getPlaceholderImage(token.name, token.ticker)}
          alt={token.name}
          className="w-full h-full object-cover"
          placeholder={token.ticker?.substring(0, 2) || 'TK'}
          fallback={
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {token.ticker || 'TK'}
              </span>
            </div>
          }
        />
      </div>

      {/* Info Area */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold text-foreground truncate mb-1">{token.name}</h3>
          <p className="text-sm font-medium text-muted-foreground mb-1">{token.ticker}</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">by</span>
            {token.creatorName ? (
              <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                {token.creatorAvatar && (
                  <img
                    src={token.creatorAvatar}
                    alt={token.creatorName}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                )}
                <span className="text-xs font-medium">{token.creatorName}</span>
                {token.creatorName.includes('Platform') && (
                  <span className="text-xs text-primary">✓</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unknown</span>
            )}
            <span className="text-xs text-muted-foreground">• {getTimeAgo(token.created_at)}</span>
          </div>
        </div>

        {/* Market Cap + Bonding Progress */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">MC {formatMarketCap(calculateMarketCap(token).toString())}</span>

          {/* Progress Bar */}
          <div className="flex-1 max-w-[180px] h-2 bg-input rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getBondingProgress()}%` }}
            ></div>
          </div>

          <span
            className={`text-sm font-medium ${
              token.priceChange >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {token.priceChange >= 0 ? "▲" : "▼"} {Math.abs(token.priceChange)}%
          </span>
        </div>

  
    
        {/* Description */}
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          Exciting new token launch with huge potential! Join the community and be part of the next big thing.
        </p>

        {/* Contract Address */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {token.contractAddress || token.contract ?
              `${(token.contractAddress || token.contract).slice(0, 6)}...${(token.contractAddress || token.contract).slice(-4)}` :
              'Unknown'
            }
          </span>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            View
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};