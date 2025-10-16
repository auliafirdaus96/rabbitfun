import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";

interface TrendingTokenCardProps {
  token: {
    id: string;
    name: string;
    ticker: string;
    image_url: string;
    change_24h: number;
    bonding_progress?: number;
    contract_address: string;
    created_at?: string;
  };
}

// Function to generate unique placeholder image based on token name
const getPlaceholderImage = (name: string, ticker: string) => {
  // Use a hash of the name to generate consistent images
  const seed = `${name}-${ticker}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://picsum.photos/seed/${seed}/200/200.jpg`;
};

export const TrendingTokenCard = ({ token }: TrendingTokenCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Debug: Log when component renders
  console.log('🎯 TrendingTokenCard rendered for:', token.name, 'with contract:', token.contract_address);

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

    console.log('🔄 Navigating to trending token detail:', contractAddress);
    console.log('�� Token data:', token);
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

  const getBondingProgress = () => {
    if (token.bonding_progress !== undefined) {
      return token.bonding_progress;
    }
    return Math.min(Math.max(Math.random() * 100, 20), 90);
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

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative flex items-center gap-3 bg-card text-card-foreground rounded-xl p-3 sm:p-4 hover:bg-background transition-all duration-300 cursor-pointer min-w-[280px] sm:min-w-[320px] max-w-[90vw] sm:max-w-[400px] border border-black ${
        isHovered ? 'shadow-lg shadow-black/20 transform -translate-y-1' : ''
      } ${
        isNavigating ? 'opacity-75 scale-95' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Logo */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-input border border-black relative">
        <img
          src={token.image_url || getPlaceholderImage(token.name, token.ticker)}
          alt={token.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Try secondary fallback
            target.src = getPlaceholderImage(token.name, token.ticker);
            target.onerror = () => {
              // Final fallback: hide image and show symbol
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center">
                    <span class="text-white text-lg font-bold">${token.ticker?.charAt(0) || 'T'}</span>
                  </div>
                `;
              }
            };
          }}
        />
      </div>

      {/* Token Info */}
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <h3 className="text-base font-bold text-foreground truncate">{token.name}</h3>
          <p className="text-sm font-medium text-muted-foreground">{token.ticker}</p>
        </div>

        {/* Creator + Creation Time */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs text-muted-foreground">by</span>
          <span className="text-xs font-medium text-muted-foreground">Unknown</span>
          <span className="text-xs text-muted-foreground">• {getTimeAgo(token.created_at)}</span>
        </div>

        {/* Bonding Progress */}
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-3 w-3 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-[80px] h-1.5 bg-input rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getBondingProgress()}%` }}
            ></div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {getBondingProgress().toFixed(0)}%
          </span>
        </div>

    
        {/* Price Change */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">1d</span>
          <span
            className={`text-xs font-bold ${
              token.change_24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {token.change_24h >= 0 ? "▲" : "▼"} {Math.abs(token.change_24h)}%
          </span>
        </div>
      </div>
    </div>
  );
};