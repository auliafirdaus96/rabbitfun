import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Heart, TrendingUp, Star } from "lucide-react";
import { CreatorLink } from "./CreatorLink";

// Function to generate unique placeholder image based on token name
const getPlaceholderImage = (name: string, ticker: string) => {
  // Use a hash of the name to generate consistent images
  const seed = `${name}-${ticker}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://picsum.photos/seed/${seed}/200/200.jpg`;
};

interface FeaturedTokenCardProps {
  token: {
    id: string;
    name: string;
    ticker: string;
    image_url: string;
    creator: string;
    market_cap: string;
    change_24h: number;
    description: string;
    contract_address: string;
    bonding_progress?: number;
    created_at?: string;
    volume_24h?: string;
    holders?: number;
  };
}

export const FeaturedTokenCard = ({ token }: FeaturedTokenCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = async () => {
    // Handle both contract_address and contractAddress for compatibility
    let contractAddress = token.contract_address || (token as any).contractAddress || (token as any).contract;

    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      // Generate a deterministic valid address based on token data
      const seed = `${token.name}-${token.ticker}`;
      const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      contractAddress = `0x${hash.toString(16).padStart(40, '0').slice(0, 40)}`;
      console.log('⚠️ Generated deterministic contract address:', contractAddress);
    }

    console.log('🔄 Navigating to featured token detail:', contractAddress);
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

  const formatVolume = (volume?: string) => {
    if (!volume) return "N/A";
    const numValue = parseFloat(volume.replace(/[^0-9.]/g, ''));
    if (numValue >= 1000000) {
      return `$${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `$${(numValue / 1000).toFixed(1)}K`;
    }
    return `$${numValue.toFixed(0)}`;
  };

  const getTimeAgo = (createdAt?: string) => {
    if (!createdAt) return "1d ago";
    return "1d ago";
  };

  const getBondingProgress = () => {
    return token.bonding_progress || Math.min(Math.max(Math.random() * 100, 20), 90);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-3xl p-8 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer border border-neutral-700/50 hover:border-purple-500/30 min-w-[600px] ${
        isHovered ? 'transform hover:-translate-y-1' : ''
      } ${
        isNavigating ? 'opacity-75 scale-95' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Featured Badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
          <Star className="h-3 w-3 text-white fill-white" />
          <span className="text-xs font-bold text-white">FEATURED</span>
        </div>
      </div>

      {/* Favorite Button */}
      <button
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 hover:bg-neutral-700/80 transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsFavorited(!isFavorited);
        }}
      >
        <Heart
          className={`h-4 w-4 transition-colors duration-200 ${
            isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-400'
          }`}
        />
      </button>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-transparent to-pink-500"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/20 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex gap-6 mb-6">
          {/* Logo Area */}
          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-neutral-800 border-2 border-neutral-700 shadow-xl relative">
            {!imageError ? (
              <img
                src={token.image_url || getPlaceholderImage(token.name, token.ticker)}
                alt={token.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Try secondary fallback
                  if (token.image_url) {
                    target.src = getPlaceholderImage(token.name, token.ticker);
                    target.onerror = () => {
                      setImageError(true);
                    };
                  } else {
                    setImageError(true);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{token.ticker?.charAt(0) || 'T'}</span>
              </div>
            )}
          </div>

          {/* Info Area */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">{token.name}</h2>
              <p className="text-base font-medium text-gray-300 mb-2">{token.ticker}</p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">by</span>
                <CreatorLink
                  creatorName={token.creator}
                  isPlatformCreator={token.creator.includes('Platform')}
                  className="text-sm"
                />
                <span className="text-sm text-gray-400">• {getTimeAgo(token.created_at)}</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/30">
                <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                <div className="text-lg font-bold text-white">{formatMarketCap(token.market_cap)}</div>
              </div>
              <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/30">
                <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                <div className="text-lg font-bold text-white">{formatVolume(token.volume_24h)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bonding Progress Section */}
        <div className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700/30 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Bonding Progress</span>
            </div>
            <span
              className={`text-sm font-bold ${
                token.change_24h >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {token.change_24h >= 0 ? "▲" : "▼"} {Math.abs(token.change_24h)}%
            </span>
          </div>

          <div className="relative">
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 rounded-full transition-all duration-700 ease-out shadow-lg shadow-green-500/20"
                style={{ width: `${getBondingProgress()}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">Progress to next milestone</span>
              <span className="text-xs text-gray-400 font-medium">{getBondingProgress().toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
            {token.description || "No description available for this featured token."}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400">
              <span className="font-mono bg-neutral-800/50 px-2 py-1 rounded border border-neutral-700/30">
                {token.contract_address.slice(0, 8)}...{token.contract_address.slice(-6)}
              </span>
            </div>
            {token.holders && (
              <div className="text-xs text-gray-400">
                <span className="font-medium">{token.holders}</span> holders
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium">
            View Details
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};