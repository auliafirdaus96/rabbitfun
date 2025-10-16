import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWeb3 } from '@/hooks/useWeb3';
import { Wallet, LogOut, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const WalletConnect = () => {
  const [copied, setCopied] = useState(false);
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBNBBalance,
  } = useWeb3();

  const [bnbBalance, setBnbBalance] = useState<string>('0');
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);

  const handleConnect = async () => {
    try {
      // Always force confirmation when connecting
      await connectWallet(true);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast.success('Wallet disconnected');
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 56:
        return 'BNB Smart Chain';
      case 97:
        return 'BNB Smart Chain Testnet';
      default:
        return 'Unknown Network';
    }
  };

  const getNetworkColor = (chainId: number) => {
    switch (chainId) {
      case 56:
        return 'bg-green-500';
      case 97:
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  // Fetch balance when connected
  const fetchBalance = async () => {
    if (isConnected) {
      try {
        const balance = await getBNBBalance();
        setBnbBalance(parseFloat(balance).toFixed(4));
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
  };

  // Auto-fetch balance on connect
  useState(() => {
    if (isConnected) {
      fetchBalance();
    }
  });

  // Handle network switching
  const handleSwitchNetwork = async (targetChainId: number) => {
    setIsSwitchingNetwork(true);
    try {
      await switchNetwork(targetChainId);
      toast.success(`Switched to ${getNetworkName(targetChainId)}`);
    } catch (error: any) {
      toast.error(`Failed to switch network: ${error.message}`);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  if (isConnected && address) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Wallet Connected</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-red-500 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Address:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{formatAddress(address)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="h-6 w-6 p-0"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Network:</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`${getNetworkColor(chainId || 0)} text-white`}
                >
                  {getNetworkName(chainId || 0)}
                </Badge>
                {(chainId === 56 || chainId === 97) ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSwitchNetwork(97)}
                    disabled={isSwitchingNetwork}
                    className="h-6 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isSwitchingNetwork ? 'animate-spin' : ''}`} />
                    Switch to BSC Testnet
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">BNB Balance:</span>
              <span className="text-sm font-mono">{bnbBalance} BNB</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3" />
            <span>Connected to MetaMask</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Connect your MetaMask wallet to interact with the Ahiru Launchpad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect MetaMask
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-2">
          <p>• Make sure you have MetaMask installed</p>
          <p>• Switch to BNB Smart Chain (56) or BSC Testnet (97)</p>
          <p>• Have some BNB for transaction fees</p>
        </div>
      </CardContent>
    </Card>
  );
};