import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrendingProjects } from "@/components/NowTrending";
import { FilterSearch } from "@/components/FilterSearch";
import { FeaturedCoins } from "@/components/FeaturedCoins";
import { Footer } from "@/components/Footer";
import { MobileBottomNavigation } from "@/components/MobileBottomNavigation";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnectWallet = () => {
    // Implement wallet connection logic
    console.log("Connect wallet");
  };

  const handleCreateToken = () => {
    // Implement create token logic
    console.log("Create token");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col responsive-container">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <Hero />
        <TrendingProjects />
        <FilterSearch />
        <FeaturedCoins />
      </main>
      <Footer className="hidden md:block" />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation
        isConnected={isConnected}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
        onCreateToken={handleCreateToken}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};

export default Index;
