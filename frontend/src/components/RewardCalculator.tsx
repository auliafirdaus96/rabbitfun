import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, PiggyBank, Gift, Clock, CheckCircle, Calculator } from 'lucide-react';
import {
  calculateFeeDistribution,
  calculateTokenRewards,
  formatBNB,
  formatUSD,
  FEE_RATES,
  getNextMilestone,
  MILESTONES
} from '@/utils/rewardCalculation';

interface RewardCalculatorProps {
  currentVolume: number;
  tokenAddress?: string;
  isMigrated?: boolean;
  showProjections?: boolean;
  className?: string;
}

export const RewardCalculator: React.FC<RewardCalculatorProps> = ({
  currentVolume,
  tokenAddress = '',
  isMigrated = false,
  showProjections = true,
  className = ''
}) => {
  const calculation = calculateFeeDistribution(currentVolume);
  const tokenRewards = calculateTokenRewards(tokenAddress, currentVolume, isMigrated);
  const nextMilestone = getNextMilestone(currentVolume);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Rewards Card */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Trading Fee Calculator
          </CardTitle>
          <CardDescription>
            1.25% total fee • Simple & Transparent • No Expiry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Fee Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Fee */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-light">Platform</span>
                <Badge variant="secondary">{formatPercentage(FEE_RATES.PLATFORM_FEE)}</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {formatBNB(calculation.platformFee)} BNB
              </div>
              <div className="text-sm text-text-light">
                ≈ ${formatUSD(calculation.platformFee)}
              </div>
            </div>

            {/* Creator Fee */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-light flex items-center gap-1">
                  <Gift className="h-4 w-4" />
                  Creator
                </span>
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  {formatPercentage(FEE_RATES.CREATOR_FEE)}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatBNB(calculation.creatorFee)} BNB
              </div>
              <div className="text-sm text-text-light">
                ≈ ${formatUSD(calculation.creatorFee)}
              </div>
            </div>
          </div>

          {/* Summary */}
          <Separator className="bg-border/40" />

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-background border border-border/40">
              <div className="text-sm text-text-light mb-1">Your Total Rewards</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {formatBNB(calculation.creatorTotalFee)} BNB
              </div>
              <div className="text-sm text-text-light">
                ≈ ${formatUSD(calculation.creatorTotalFee)}
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-background border border-border/40">
              <div className="text-sm text-text-light mb-1">Platform Revenue</div>
              <div className="text-3xl font-bold text-muted-foreground">
                {formatBNB(calculation.platformFee)} BNB
              </div>
              <div className="text-sm text-text-light">
                ≈ ${formatUSD(calculation.platformFee)}
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className={`p-4 rounded-lg border ${isMigrated
            ? 'bg-green-500/10 border-green-500/30 text-green-700'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-700'}`}
          >
            <div className="flex items-center gap-2">
              {isMigrated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-blue-500" />
              )}
              <span className="font-medium">
                {isMigrated
                  ? `All rewards paid! You earned ${formatBNB(calculation.creatorTotalFee)} BNB total.`
                  : `You earned ${formatBNB(calculation.creatorFee)} BNB from your token's trading volume.`
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Migration Bonus Milestones
          </CardTitle>
          <CardDescription>
            Your migration bonus grows with trading volume • No time limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MILESTONES.map((milestone) => {
              const isCompleted = currentVolume >= milestone.volume;
              const isNext = nextMilestone?.volume === milestone.volume;

              return (
                <div
                  key={milestone.volume}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted
                      ? 'bg-green-500/10 border-green-500/30'
                      : isNext
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-secondary/20 border-border/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isNext ? (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border/40" />
                    )}
                    <div>
                      <div className="font-medium">{milestone.label} Volume</div>
                      <div className="text-sm text-text-light">
                        Migration bonus: {formatBNB(milestone.reward)} BNB
                      </div>
                    </div>
                  </div>
                  <Badge variant={isCompleted ? "default" : isNext ? "secondary" : "outline"}>
                    {isCompleted ? "Completed" : isNext ? "Next" : milestone.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Projections */}
      {showProjections && (
        <Card className="border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Revenue Projections
            </CardTitle>
            <CardDescription>
              See your potential earnings at different volume levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[50, 100, 250, 500].map((volume) => {
                const projection = calculateFeeDistribution(volume);
                return (
                  <div key={volume} className="p-4 rounded-lg bg-background border border-border/40">
                    <div className="text-sm text-text-light mb-1">{volume} BNB Volume</div>
                    <div className="text-xl font-bold text-primary mb-1">
                      {formatBNB(projection.creatorTotalFee)} BNB
                    </div>
                    <div className="text-xs text-text-light">
                      ≈ ${formatUSD(projection.creatorTotalFee)} total rewards
                    </div>
                    <Separator className="my-2 bg-border/40" />
                    <div className="text-xs text-text-light">
                      Platform: {formatBNB(projection.platformFee)} BNB
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RewardCalculator;