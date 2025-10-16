import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Gift,
  TrendingUp,
  Copy,
  RefreshCw,
  Wallet,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import {
  formatBNB,
  formatUSD,
  FEE_RATES
} from '@/utils/rewardCalculation';
import { useRewardSystem } from '@/hooks/useRewardSystem';

interface CreatorDashboardProps {
  walletAddress: string;
  className?: string;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  walletAddress,
  className = ''
}) => {
  // Mock wallet address for demonstration
  const mockCreatorAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  const {
    tokens,
    isLoading,
    refresh
  } = useRewardSystem(mockCreatorAddress);

  const [isClaiming, setIsClaiming] = useState(false);

  // Calculate rewards
  const totalVolume = tokens.reduce((sum, token) => sum + parseFloat(token.volume || '0'), 0);
  const totalRewards = totalVolume * FEE_RATES.CREATOR_FEE;
  const totalTokens = tokens.length;

  const handleClaimRewards = async () => {
    setIsClaiming(true);
    try {
      // Simulasi claim rewards
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Rewards claimed successfully!');
      refresh();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Address copied to clipboard!');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/'}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start">
        <div>
          <h2 className="text-3xl font-bold">Creator Profile</h2>
          <p className="text-text-light">Manage your tokens and claim rewards</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Token Creator</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Wallet className="w-4 h-4" />
                  {formatAddress(mockCreatorAddress)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(mockCreatorAddress)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://bscscan.com/address/${mockCreatorAddress}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {totalTokens} Tokens
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Total Volume</span>
            </div>
            <div className="text-3xl font-bold">{formatBNB(totalVolume)}</div>
            <div className="text-sm text-text-light mt-1">BNB trading volume</div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Gift className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Available Rewards</span>
            </div>
            <div className="text-3xl font-bold text-green-500">
              {formatBNB(totalRewards)}
            </div>
            <div className="text-sm text-text-light mt-1">
              ≈ ${formatUSD(totalRewards)} • 0.25% fee
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-gradient-to-br from-primary/10 to-purple-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Reward Rate</span>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              0.25%
            </div>
            <div className="text-sm text-text-light mt-1">
              of all trading volume
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claim Rewards Section */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-500" />
            Claim Your Rewards
          </CardTitle>
          <CardDescription>
            Claim your creator rewards from trading fees. You earn 0.25% of all trading volume for your tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div>
              <div className="font-medium text-green-700">Ready to Claim</div>
              <div className="text-sm text-green-600">
                {formatBNB(totalRewards)} BNB (≈ ${formatUSD(totalRewards)})
              </div>
            </div>
            <Button
              onClick={handleClaimRewards}
              disabled={isClaiming || totalRewards <= 0}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isClaiming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Claim Rewards
                </>
              )}
            </Button>
          </div>

          {totalRewards <= 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No rewards available yet.</p>
              <p className="text-sm">Start creating tokens to earn rewards from trading fees!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Tokens */}
      <Card className="border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            My Created Tokens
          </CardTitle>
          <CardDescription>
            Manage your tokens and track their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token, index) => (
                <div key={token.tokenAddress} className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {token.name || 'Unknown Token'} ({token.symbol || 'UNK'})
                        </div>
                        <div className="text-sm text-text-light">
                          {formatAddress(token.tokenAddress)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(token.tokenAddress)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://bscscan.com/address/${token.tokenAddress}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-text-light">Volume</div>
                      <div className="font-medium">{formatBNB(parseFloat(token.volume || '0'))} BNB</div>
                    </div>
                    <div>
                      <div className="text-text-light">Rewards</div>
                      <div className="font-medium text-green-500">
                        {formatBNB(parseFloat(token.volume || '0') * FEE_RATES.CREATOR_FEE)} BNB
                      </div>
                    </div>
                    <div>
                      <div className="text-text-light">Created</div>
                      <div className="font-medium">
                        {new Date(token.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-light">Status</div>
                      <Badge variant={token.isInBonding ? "secondary" : "default"}>
                        {token.isInBonding ? "Bonding" : "Graduated"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tokens created yet</h3>
              <p className="text-sm mb-6">Start creating your first token to earn rewards!</p>
              <Button onClick={() => window.location.href = '/'} className="bg-primary text-white">
                Create Your First Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorDashboard;