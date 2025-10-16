import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Wallet, Copy, ExternalLink, LogOut, Sparkles, BarChart3, Radio, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { walletService } from "@/utils/wallet";
import { CreateCoinModal } from "@/components/CreateCoinModal";
import { CreatorRewardModal } from "@/components/CreatorRewardModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNavigation } from "./MobileNavigation";

export const Header = () => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [fullWalletAddress, setFullWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  
  const handleConnectWallet = async () => {
    if (isConnected) {
      // Don't disconnect here, just open the dropdown
      return;
    } else {
      // Connect wallet
      setIsConnecting(true);
      try {
        const result = await walletService.connectWallet();
        setWalletAddress(result.address);
        setIsConnected(result.isConnected);

        // Get full address
        const fullAddress = await walletService.getFullAddress();
        if (fullAddress) {
          setFullWalletAddress(fullAddress);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        // You could show a toast notification here
        alert('Failed to connect wallet. Please make sure MetaMask is installed and unlocked.');
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could show a toast notification here
      alert('Address copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleDisconnect = () => {
    walletService.disconnectWallet();
    setIsConnected(false);
    setWalletAddress("");
    setFullWalletAddress("");
  };

  const viewOnBscScan = () => {
    window.open(`https://bscscan.com/address/${fullWalletAddress}`, '_blank');
  };
  return (
    <>
      <header data-testid="header" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-top">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          {/* Modern Logo - Optimized for Mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg sm:text-xl font-bold">R</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              RabbitFun
            </span>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              data-testid="create-token-button"
              variant="outline"
              className="h-10 border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200"
              onClick={() => setIsCreateModalOpen(true)}
            >
              🚀 Create Token
            </Button>

            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    className="h-10 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>{walletAddress}</span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-card border-border">
                  <div className="px-2 py-3 border-b border-border/40">
                    <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
                    <p className="text-sm font-mono text-foreground break-all">
                      {fullWalletAddress}
                    </p>
                  </div>

                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => copyToClipboard(fullWalletAddress)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Address</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-secondary"
                    onClick={viewOnBscScan}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>View on BSCScan</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/40" />

                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-secondary text-red-500"
                    onClick={handleDisconnect}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                data-testid="connect-wallet-button"
                variant="default"
                className="h-10 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </span>
              </Button>
            )}

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-primary hover:shadow-neon-sm transition-all">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-secondary group"
                  onClick={() => navigate('/creator-dashboard')}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:translate-x-1 transition-transform duration-200">Creator Rewards</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border/40" />

                <DropdownMenuItem className="cursor-pointer hover:bg-secondary opacity-60 group">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:translate-x-1 transition-transform duration-200">Advanced</div>
                    <div className="text-xs text-muted-foreground group-hover:translate-x-1 transition-transform duration-200">Coming Soon</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer hover:bg-secondary opacity-60 group">
                  <Radio className="mr-2 h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:translate-x-1 transition-transform duration-200">Livestreams</div>
                    <div className="text-xs text-muted-foreground group-hover:translate-x-1 transition-transform duration-200">Coming Soon</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer hover:bg-secondary opacity-60 group">
                  <Gamepad2 className="mr-2 h-4 w-4 text-purple-500" />
                  <div className="flex-1">
                    <div className="font-medium group-hover:translate-x-1 transition-transform duration-200">Games</div>
                    <div className="text-xs text-muted-foreground group-hover:translate-x-1 transition-transform duration-200">Coming Soon</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200"
              onClick={() => setIsCreateModalOpen(true)}
            >
              🚀
            </Button>

            {isConnected ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs"
                onClick={() => {}} // Will open mobile wallet menu
              >
                <Wallet className="h-3 w-3" />
                <span className="hidden xs:inline ml-1">{walletAddress.slice(0, 4)}...</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="h-8 px-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-xs"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                <Wallet className="h-3 w-3" />
                <span className="hidden xs:inline ml-1">Connect</span>
              </Button>
            )}

            <ThemeToggle />

            <MobileNavigation
              isConnected={isConnected}
              walletAddress={walletAddress}
              onConnectWallet={handleConnectWallet}
              onCreateToken={() => setIsCreateModalOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Create Coin Modal */}
      <CreateCoinModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        isConnected={isConnected}
        onConnectWallet={handleConnectWallet}
      />

      {/* Creator Reward Modal */}
      <CreatorRewardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        isConnected={isConnected}
        onConnectWallet={handleConnectWallet}
      />
    </>
  );
};