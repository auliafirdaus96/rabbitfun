import { TrendingUp, TrendingDown, Heart, Share2, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenCardMobileProps {
  token: {
    name: string;
    symbol: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
    holders: number;
    createdAt: string;
    image?: string;
    description?: string;
    isLiked?: boolean;
    isNew?: boolean;
    isTrending?: boolean;
  };
  onLike?: (tokenSymbol: string) => void;
  onShare?: (token: any) => void;
  onViewDetails?: (token: any) => void;
  onBuy?: (token: any) => void;
}

export const TokenCardMobile = ({
  token,
  onLike,
  onShare,
  onViewDetails,
  onBuy
}: TokenCardMobileProps) => {
  const isPositive = token.priceChange24h >= 0;
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(token.price);

  const formattedMarketCap = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(token.marketCap);

  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(token.volume24h);

  return (
    <Card className="mobile-card-compact hover-card group cursor-pointer w-full">
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Token Image */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                {token.image ? (
                  <img
                    src={token.image}
                    alt={token.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-white text-lg font-bold">
                    {token.symbol.charAt(0)}
                  </span>
                )}
              </div>
              {/* Status Indicators */}
              <div className="absolute -top-1 -right-1 flex gap-1">
                {token.isNew && (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                )}
                {token.isTrending && (
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse delay-100"></div>
                )}
              </div>
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground mobile-text-ellipsis">
                  {token.name}
                </h3>
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {token.symbol}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mobile-text-ellipsis">
                {token.description || "No description available"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(token.symbol);
              }}
            >
              <Heart
                className={`h-4 w-4 ${token.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.(token);
              }}
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-foreground">
              {formattedPrice}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>
                {isPositive ? '+' : ''}{token.priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Market Cap</div>
            <div className="text-sm font-semibold text-foreground">
              {formattedMarketCap}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <div className="text-xs text-muted-foreground">24h Volume</div>
            <div className="text-sm font-semibold text-foreground">
              {formattedVolume}
            </div>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <div className="text-xs text-muted-foreground">Holders</div>
            <div className="text-sm font-semibold text-foreground">
              {token.holders.toLocaleString()}
            </div>
          </div>
          <div className="text-center p-2 bg-secondary/30 rounded-lg">
            <div className="text-xs text-muted-foreground">Created</div>
            <div className="text-sm font-semibold text-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(token.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 touch-target-improved"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.(token);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button
            className="flex-1 touch-target-improved bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.(token);
            }}
          >
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};