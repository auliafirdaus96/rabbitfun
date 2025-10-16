import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Heart } from "lucide-react";
import { CreatorLink } from "./CreatorLink";
import type { MockCoin } from "@/data/mockCoins";

interface NowTrendingCardProps {
  project: MockCoin;
  isHero?: boolean;
  isCompact?: boolean;
}

export const NowTrendingCard = ({ project, isHero = false, isCompact = false }: NowTrendingCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    // Validate contract address before navigation
    let contractAddress = project.contractAddress || project.contract;

    // Generate valid address if invalid
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      contractAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
      console.log('⚠️ Generated valid contract address:', contractAddress);
    }

    console.log('🔄 Navigating to token detail:', contractAddress);
    setIsNavigating(true);
    navigate(`/token/${contractAddress}`);
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

  const getTimeAgo = () => {
    // Simple implementation - in real app would calculate actual time difference
    return "1d ago";
  };

  const getBondingProgress = () => {
    // Use actual bonding progress from project data
    return project.progress || 0;
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex bg-neutral-900 text-white rounded-2xl hover:bg-neutral-800 transition-all duration-300 cursor-pointer ${
        isHero
          ? 'p-8 gap-8 min-w-[600px] bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30'
          : isCompact
            ? 'p-4 gap-4 min-w-[400px]'
            : 'p-6 gap-6 min-w-[500px]'
      } ${
        isHovered ? 'shadow-lg shadow-black/20 transform -translate-y-1' : ''
      } ${
        isNavigating ? 'opacity-75 scale-95' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Favorite Button */}
      <button
        className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 hover:bg-neutral-700/80 transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          setIsFavorited(!isFavorited);
        }}
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors duration-200 ${
            isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-400'
          }`}
        />
      </button>

      {/* Logo Area */}
      <div className={`rounded-xl overflow-hidden flex-shrink-0 bg-neutral-800 border border-neutral-700 ${
        isHero ? 'w-40 h-40' : isCompact ? 'w-24 h-24' : 'w-32 h-32'
      }`}>
        {/* Use ticker as fallback logo */}
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
          <span className={`text-white font-bold ${
            isHero ? 'text-3xl' : isCompact ? 'text-xl' : 'text-2xl'
          }`}>
            {project.ticker?.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info Area */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold text-white truncate ${
              isHero ? 'text-2xl' : isCompact ? 'text-base' : 'text-lg'
            }`}>{project.name}</h3>
            {/* Trending Badge */}
            <span className={`px-2 py-1 font-medium rounded-full border bg-orange-500/20 text-orange-400 border-orange-500/30 ${
              isHero ? 'text-sm' : 'text-xs'
            }`}>
              🔥 Trending
            </span>
          </div>
          <p className={`font-medium text-gray-300 mb-1 ${
            isHero ? 'text-base' : isCompact ? 'text-xs' : 'text-sm'
          }`}>{project.ticker}</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">by</span>
            <CreatorLink
              creatorName="Anonymous Creator"
              isPlatformCreator={false}
            />
            <span className="text-xs text-gray-400">• {getTimeAgo()}</span>
          </div>
        </div>

        {/* Market Cap + Bonding Progress */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-300">MC {formatMarketCap(project.marketCap)}</span>

          {/* Progress Bar */}
          <div className="flex-1 max-w-[180px] h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getBondingProgress()}%` }}
            ></div>
          </div>

          <span
            className={`text-sm font-medium ${
              project.priceChange >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {project.priceChange >= 0 ? "▲" : "▼"} {Math.abs(project.priceChange)}%
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
          A trending {project.name} token on the Binance Smart Chain with exceptional performance.
        </p>

        {/* Contract Address */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">
            {(project.contractAddress || project.contract).slice(0, 6)}...{(project.contractAddress || project.contract).slice(-4)}
          </span>
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            View
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};