import React from 'react';
import { Header } from "@/components/Header";
import { CreatorDashboard as CreatorDashboardComponent } from "@/components/CreatorDashboard";
import { Footer } from "@/components/Footer";

const CreatorDashboardPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <CreatorDashboardComponent walletAddress="0x1234...5678" />
      </main>
      <Footer />
    </div>
  );
};

export default CreatorDashboardPage;