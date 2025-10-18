import { TokenCard } from "./TokenCard";
import { TokenCardSkeleton } from "./TokenCardSkeleton";
import { useSearch } from "@/contexts/SearchContext";
import { useState, useEffect } from "react";
import { mockCoins } from "@/data/mockCoins";

export const FeaturedCoins = () => {
  const { searchState } = useSearch();
  const { filteredFeaturedCoins } = searchState;
  const [isLoading, setIsLoading] = useState(true);

  // Get all tokens for featured grid (exclude brand new tokens)
  const featuredTokens = [...mockCoins]
    .filter(coin => coin.progress > 0) // Exclude brand new tokens with 0 progress
    .sort((a, b) => b.progress - a.progress) // Sort by progress (highest first)
    .slice(0, 8); // Top 8 tokens

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="w-full py-8 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-48 h-48 bg-primary/20 rounded-full filter blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-purple-500/20 rounded-full filter blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="space-y-8">
          {/* Enhanced Section Header */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              ⭐ Featured Coins
            </h2>
          </div>

          {/* Coins Grid */}
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, index) => (
                <TokenCardSkeleton key={index} />
              ))}
            </div>
          ) : featuredTokens.length > 0 ? (
            <div className="max-w-6xl mx-auto px-2 sm:px-4">
              {/* Featured Coins Grid - 2 Cards Per Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {featuredTokens.map((coin, index) => (
                  <div key={coin.id} className="transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="relative">
                      {/* Special highlight for first card */}
                      {index === 0 && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-xl"></div>
                      )}
                      <div className="relative">
                        <TokenCard token={coin} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="space-y-4">
                <div className="text-6xl">
                  {searchState.searchTerm ? '🔍' : '🎯'}
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {searchState.searchTerm
                    ? `No featured coins found for "${searchState.searchTerm}"`
                    : "No featured coins available"}
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchState.searchTerm
                    ? "Try adjusting your search terms or browse all tokens"
                    : "Be the first to create a featured token!"}
                </p>
                {!searchState.searchTerm && (
                  <button className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-semibold hover:from-primary/90 hover:to-purple-600/90 transition-all duration-200">
                    🚀 Create First Token
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};