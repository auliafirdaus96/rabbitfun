import { TrendingTokenCard } from "./TrendingTokenCard";
import { useSearch } from "@/contexts/SearchContext";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { mockCoins } from "@/data/mockCoins";

export const TrendingProjects = () => {
  const { searchState } = useSearch();
  const { filteredProjects } = searchState;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Convert MockCoin data to match TrendingTokenCard interface
  const convertCoinToToken = (coin: any) => ({
    id: coin.id,
    name: coin.name,
    ticker: coin.ticker,
    image_url: coin.image || '',
    change_24h: coin.priceChange || 0,
    bonding_progress: coin.progress || 0,
    contract_address: coin.contractAddress || coin.contract || '',
    created_at: coin.created_at // Pass through the created_at field
  });

  // Get top 6 coins with highest price changes for trending (exclude brand new tokens)
  const trendingTokens = [...mockCoins]
    .filter(coin => coin.progress > 0) // Exclude brand new tokens with 0 progress
    .sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    .slice(0, 6);

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [filteredProjects]);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = window.innerWidth < 640 ? 300 : 400;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = window.innerWidth < 640 ? 300 : 400;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden py-4 sm:py-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-48 h-48 bg-primary/20 rounded-full filter blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-purple-500/20 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="space-y-10">
          {/* Section Header */}
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
                Trending Tokens
              </h2>
            </div>
          </div>

          {/* Projects Display */}
          <div className="space-y-8">
            {/* Horizontal Scroll Container */}
            <div className="relative">
              {/* Left Navigation Arrow */}
              <button
                onClick={scrollLeft}
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-card/90 backdrop-blur-sm rounded-full border border-black sm:flex items-center justify-center transition-all duration-200 hover:bg-card hover:scale-110 ${
                  canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } ${isMobile ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>

              {/* Right Navigation Arrow */}
              <button
                onClick={scrollRight}
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-card/90 backdrop-blur-sm rounded-full border border-black sm:flex items-center justify-center transition-all duration-200 hover:bg-card hover:scale-110 ${
                  canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } ${isMobile ? 'opacity-0 pointer-events-none' : ''}`}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>

              {/* Horizontal Scroll Area */}
              <div
                ref={scrollContainerRef}
                className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-2 py-4"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {(filteredProjects.length > 0 ? filteredProjects : trendingTokens).map((coin) => (
                  <div
                    key={coin.id}
                    className="flex-shrink-0 transform transition-all duration-300 hover:scale-105 w-[280px] sm:w-[320px]"
                  >
                    <TrendingTokenCard token={convertCoinToToken(coin)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Load More Button */}
            {(filteredProjects.length > 8 || trendingTokens.length > 8) && (
              <div className="text-center pt-4">
                <button className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25">
                  View All Trending Tokens
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};