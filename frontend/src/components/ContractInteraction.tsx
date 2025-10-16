import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ContractInteractionProps {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

export const ContractInteraction = ({ tokenAddress, tokenName, tokenSymbol }: ContractInteractionProps) => {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Mock approve functionality
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${tokenSymbol} approved successfully`);
    } catch (error) {
      toast.error("Failed to approve token");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    setLoading(true);
    try {
      // Mock transfer functionality
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${tokenSymbol} transferred successfully`);
    } catch (error) {
      toast.error("Failed to transfer token");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWallet = async () => {
    try {
      const eth = (window as any)?.ethereum;
      if (!eth) {
        toast.error("MetaMask not detected");
        return;
      }

      await eth.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: 18,
            image: `https://via.placeholder.com/96/4F46E5/FFFFFF?text=${tokenSymbol}`,
          },
        },
      });

      toast.success(`${tokenName} added to wallet`);
    } catch (error) {
      toast.error("Failed to add token to wallet");
    }
  };

  return (
    <Card className="border-2 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Contract Interaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Token Address</div>
          <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {tokenAddress}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            onClick={handleApprove}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Approve"}
          </Button>

          <Button
            variant="outline"
            onClick={handleTransfer}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Transfer"}
          </Button>

          <Button
            variant="outline"
            onClick={handleAddToWallet}
            className="w-full"
          >
            Add to Wallet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};