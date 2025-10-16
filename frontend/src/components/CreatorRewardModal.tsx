import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Wallet, Gift, Calculator, TrendingUp, Clock, CheckCircle, Sparkles } from "lucide-react";
import {
  calculateFeeDistribution,
  formatBNB,
  formatUSD,
  FEE_RATES,
  MILESTONES,
  getNextMilestone
} from "@/utils/rewardCalculation";

interface CreatorRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectWallet: () => void;
}

export const CreatorRewardModal = ({ isOpen, onClose, isConnected, onConnectWallet }: CreatorRewardModalProps) => {
  const navigate = useNavigate();
  const [simulationVolume, setSimulationVolume] = useState("100"); // Default 100 BNB for simulation
  const [currentNetwork, setCurrentNetwork] = useState({
    name: 'Unknown',
    chainId: 0
  });

  // Network detection
  useEffect(() => {
    const updateNetworkInfo = async () => {
      if (window.ethereum && isConnected) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNumber = parseInt(chainId, 16);

            let networkName = 'Unknown';
            if (chainIdNumber === 97) networkName = 'BSC Testnet';
            else if (chainIdNumber === 56) networkName = 'BSC Mainnet';
            else if (chainIdNumber === 1) networkName = 'Ethereum Mainnet';
            else networkName = `Chain ID: ${chainIdNumber}`;

            setCurrentNetwork({ name: networkName, chainId: chainIdNumber });
          }
        } catch (error) {
          console.error('Error getting network info:', error);
        }
      }
    };

    updateNetworkInfo();
  }, [isConnected, isOpen]);

  // Calculate rewards based on simulation volume
  const volume = parseFloat(simulationVolume) || 0;
  const calculation = calculateFeeDistribution(volume);
  const nextMilestone = getNextMilestone(volume);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSimulationVolume(value);
    }
  };

  const handleClose = () => {
    onClose();
    setSimulationVolume("100"); // Reset to default
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            Creator Rewards Calculator
          </DialogTitle>
          <p className="text-sm text-text-light">
            Simple 2-way split: 1% platform • 0.25% creator • Total 1.25% fee
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-500">
                <Wallet className="h-5 w-5" />
                <span className="font-medium">Connect Your Wallet</span>
              </div>
              <p className="text-sm text-text-light mt-1">
                Connect your wallet to see your actual rewards and token data.
              </p>
              <Button
                onClick={onConnectWallet}
                className="mt-2 w-full"
                variant="outline"
              >
                Connect Wallet
              </Button>
            </div>
          )}

          {isConnected && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-500">
                <Wallet className="h-5 w-5" />
                <span className="font-medium">Wallet Connected</span>
              </div>
              <p className="text-sm text-text-light mt-1">
                <strong>Network:</strong> {currentNetwork.name} (Chain ID: {currentNetwork.chainId})
              </p>
            </div>
          )}

          {/* Volume Calculator */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Reward Calculator</h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="volume" className="text-sm font-medium">
                Trading Volume (BNB)
              </label>
              <div className="relative">
                <Input
                  id="volume"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="100"
                  value={simulationVolume}
                  onChange={handleVolumeChange}
                  className="pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-sm text-muted-foreground">BNB</span>
                </div>
              </div>
              <p className="text-xs text-text-light">
                Enter your expected trading volume to see potential rewards
              </p>
            </div>

            {/* Quick Volume Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 250, 500, 1000].map((vol) => (
                <Button
                  key={vol}
                  variant="outline"
                  size="sm"
                  onClick={() => setSimulationVolume(vol.toString())}
                  className={`text-xs ${simulationVolume === vol.toString() ? 'border-primary bg-primary/10' : ''}`}
                >
                  {vol} BNB
                </Button>
              ))}
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fee Distribution (1.25% Total)</h3>

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
                  {formatBNB(calculation.creatorFee)} BNB
                </div>
                <div className="text-sm text-text-light">
                  ≈ ${formatUSD(calculation.creatorFee)}
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
          </div>

          {/* Key Benefits */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Why This System is Better</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Lower fees (1.25% vs 2%+)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>No expiry dates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>No time pressure</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Simple & transparent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Migration Bonus Milestones</h3>
            <p className="text-sm text-text-light">
              Your migration bonus grows with trading volume • No time limits
            </p>

            <div className="space-y-2">
              {MILESTONES.slice(0, 5).map((milestone) => {
                const isCompleted = volume >= milestone.volume;
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
          </div>

          {/* Projections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Revenue Projections</h3>
            <p className="text-sm text-text-light">
              See your potential earnings at different volume levels
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[50, 100, 250, 500].map((vol) => {
                const projection = calculateFeeDistribution(vol);
                return (
                  <div key={vol} className="p-3 rounded-lg bg-background border border-border/40">
                    <div className="text-sm text-text-light mb-1">{vol} BNB Volume</div>
                    <div className="text-lg font-bold text-primary mb-1">
                      {formatBNB(projection.creatorFee)} BNB
                    </div>
                    <div className="text-xs text-text-light">
                      ≈ ${formatUSD(projection.creatorFee)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          {isConnected && (
            <Button
              onClick={() => {
                navigate('/creator-dashboard');
                onClose();
              }}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
            >
              View My Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};