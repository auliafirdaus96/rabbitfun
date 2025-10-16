import { useState, useEffect } from "react";
import { Home, TrendingUp, Star, BarChart3, Rocket, Wallet, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileBottomNavigationProps {
  isConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  onCreateToken: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const MobileBottomNavigation = ({
  isConnected,
  walletAddress,
  onConnectWallet,
  onCreateToken,
  activeTab = "home",
  onTabChange
}: MobileBottomNavigationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show bottom nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navigationItems = [
    { id: "home", icon: Home, label: "Home", href: "#home" },
    { id: "trending", icon: TrendingUp, label: "Trending", href: "#trending" },
    { id: "create", icon: Plus, label: "Create", href: "#create", special: true },
    { id: "search", icon: Search, label: "Search", href: "#search" },
    { id: "profile", icon: Wallet, label: "Profile", href: "#profile" },
  ];

  const handleTabClick = (item: any) => {
    if (item.id === "create") {
      onCreateToken();
    } else if (item.id === "profile" && !isConnected) {
      onConnectWallet();
    } else {
      onTabChange?.(item.id);
      // Handle navigation
      console.log('Navigate to:', item.href);
    }
  };

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-background/95 backdrop-blur-lg border-t border-border/40
        transition-transform duration-300 ease-in-out
        md:hidden
        safe-area-bottom
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item)}
                className={`
                  flex flex-col items-center justify-center
                  min-h-[3rem] min-w-[3rem] px-2 py-1
                  rounded-lg transition-all duration-200
                  touch-target-improved
                  ${item.special
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg hover:shadow-xl'
                    : isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }
                `}
              >
                <div className="relative">
                  <Icon
                    className={`
                      h-5 w-5
                      ${item.special ? 'h-6 w-6' : ''}
                      ${isActive ? 'scale-110' : ''}
                   `}
                  />
                  {item.id === "profile" && isConnected && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
                <span className={`
                  text-xs mt-1 font-medium
                  ${item.special ? 'text-white' : ''}
                  ${isActive ? 'text-primary' : ''}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};