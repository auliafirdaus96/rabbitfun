import React from "react";
import { TrendingTokenCard } from "./TrendingTokenCard";

// Example usage of TrendingTokenCard
export const TrendingTokenCardExample = () => {
  const exampleTokens = [
    {
      id: "1",
      name: "Pepe Moon",
      ticker: "PEPEMOON",
      image_url: "/api/placeholder/64/64",
      change_24h: 24.5,
      bonding_progress: 75,
      contract_address: "0x1234567890abcdef1234567890abcdef12345678"
    },
    {
      id: "2",
      name: "Shib Rocket",
      ticker: "SHIBR",
      image_url: "/api/placeholder/64/64",
      change_24h: -12.3,
      bonding_progress: 45,
      contract_address: "0x2345678901bcdef12345678901bcdef123456789"
    },
    {
      id: "3",
      name: "Dogecoin 2.0",
      ticker: "DOGE2",
      image_url: "/api/placeholder/64/64",
      change_24h: 8.7,
      bonding_progress: 92,
      contract_address: "0x3456789012cdef123456789012cdef1234567890"
    }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Trending Tokens</h2>
      <div className="flex flex-wrap gap-4">
        {exampleTokens.map((token) => (
          <TrendingTokenCard key={token.id} token={token} />
        ))}
      </div>
    </div>
  );
};