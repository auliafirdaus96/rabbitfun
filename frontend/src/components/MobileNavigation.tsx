import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, BarChart3, Wallet, Sparkles, Radio, Gamepad2 } from "lucide-react";

interface MobileNavigationProps {
  isConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  onCreateToken: () => void;
}

export const MobileNavigation = ({ isConnected, walletAddress, onConnectWallet, onCreateToken }: MobileNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const navigationItems = [
    { icon: Sparkles, label: "Creator Rewards", href: "/creator-dashboard", disabled: false },
    { icon: BarChart3, label: "Advanced", href: "#advanced", disabled: true, subtitle: "Coming Soon" },
    { icon: Radio, label: "Livestreams", href: "#livestreams", disabled: true, subtitle: "Coming Soon" },
    { icon: Gamepad2, label: "Games", href: "#games", disabled: true, subtitle: "Coming Soon" },
  ];

  const handleNavigation = (href: string, disabled?: boolean) => {
    setIsOpen(false);
    if (!disabled) {
      if (href.startsWith('/')) {
        navigate(href);
      } else {
        console.log('Navigate to:', href);
      }
    }
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-primary hover:shadow-neon-sm transition-all">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-card border-border p-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-border/40">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">R</span>
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                RabbitFun
              </h3>
              <p className="text-xs text-text-light">
                {isConnected ? walletAddress : "Not Connected"}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleNavigation(item.href, item.disabled)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                    ${item.disabled
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-primary/10 cursor-pointer'
                    }
                  `}
                >
                  <item.icon className={`
                    h-5 w-5
                    ${item.disabled ? 'text-muted-foreground' : 'text-primary'}
                  `} />
                  <div className="flex-1">
                    <span className={`
                      font-medium
                      ${item.disabled ? 'text-muted-foreground' : 'text-foreground'}
                    `}>{item.label}</span>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-border/40 space-y-3">
            {!isConnected ? (
              <Button
                onClick={onConnectWallet}
                className="w-full h-10 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {walletAddress}
                    </p>
                    <p className="text-xs text-text-light">Connected</p>
                  </div>
                </div>
                <Button
                  onClick={onCreateToken}
                  className="w-full h-10 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  🚀 Create Token
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40">
            <div className="text-center space-y-2">
              <p className="text-xs text-text-light">
                Version 1.0.0
              </p>
              <div className="flex justify-center gap-4">
                <a href="#" className="text-xs text-primary hover:underline">
                  Terms
                </a>
                <a href="#" className="text-xs text-primary hover:underline">
                  Privacy
                </a>
                <a href="#" className="text-xs text-primary hover:underline">
                  Support
                </a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};