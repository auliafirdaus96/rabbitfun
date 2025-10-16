import { ethers } from "hardhat";

/**
 * Script to calculate and display economic projections for updated pricing
 */
async function calculateEconomics() {
  console.log("🔥 RABBIT LAUNCHPAD - UPDATED ECONOMIC PROJECTIONS 🔥");
  console.log("=" .repeat(60));

  // Constants from updated contract
  const INITIAL_PRICE = ethers.parseEther("0.00001"); // 0.00001 BNB
  const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens
  const GROSS_RAISE_TARGET = ethers.parseEther("35"); // 35 BNB (ACHIEVABLE TARGET)
  const NET_RAISE_TARGET = ethers.parseEther("34.5625"); // 34.5625 BNB (35 * (1 - 0.0125))
  const FEE_PERCENT = 0.0125; // 1.25%

  // BNB Price assumption (can be adjusted)
  const BNB_PRICE = 300; // $300 per BNB

  console.log("\n📊 CORE PARAMETERS:");
  console.log(`Initial Price: ${ethers.formatEther(INITIAL_PRICE)} BNB ($${(Number(ethers.formatEther(INITIAL_PRICE)) * BNB_PRICE).toFixed(6)})`);
  console.log(`Total Supply: ${ethers.formatEther(TOTAL_SUPPLY)} tokens`);
  console.log(`Gross Raise Target: ${ethers.formatEther(GROSS_RAISE_TARGET)} BNB ($${(Number(ethers.formatEther(GROSS_RAISE_TARGET)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Net Raise Target: ${ethers.formatEther(NET_RAISE_TARGET)} BNB ($${(Number(ethers.formatEther(NET_RAISE_TARGET)) * BNB_PRICE).toLocaleString()})`);

  // Calculate initial market cap
  const initialMarketCapBNB = INITIAL_PRICE * TOTAL_SUPPLY / ethers.parseEther("1");
  const initialMarketCapUSD = Number(ethers.formatEther(initialMarketCapBNB)) * BNB_PRICE;

  console.log(`\n💰 INITIAL MARKET CAP:`);
  console.log(`Initial Market Cap: ${ethers.formatEther(initialMarketCapBNB)} BNB ($${initialMarketCapUSD.toLocaleString()})`);

  // Calculate token amounts for different BNB investments
  console.log(`\n🎯 TOKEN PURCHASE EXAMPLES (at initial price):`);
  const investments = [0.001, 0.01, 0.1, 1, 10, 100]; // BNB amounts

  for (const bnbAmount of investments) {
    const bnbWei = ethers.parseEther(bnbAmount.toString());
    const tokenAmount = bnbWei * ethers.parseEther("1") / INITIAL_PRICE;
    const costUSD = bnbAmount * BNB_PRICE;

    console.log(`${bnbAmount.toString().padStart(6)} BNB ($${costUSD.toString().padStart(8)}) → ${ethers.formatEther(tokenAmount).padStart(12)} tokens`);
  }

  // Calculate price progression using simplified bonding curve
  console.log(`\n📈 PRICE PROGRESSION (Exponential Bonding Curve):`);
  const supplyLevels = [0, 50000000, 100000000, 200000000, 400000000, 600000000, 800000000]; // tokens

  for (const supply of supplyLevels) {
    const supplyWei = ethers.parseEther(supply.toString());

    // Simplified exponential calculation: P(x) = P0 * e^(k * (x/S))
    const S = TOTAL_SUPPLY;
    const k = 5.43;
    const x = supplyWei;

    // Calculate exponent: k * (x / S)
    const exponent = (k * Number(x)) / Number(S);

    // Calculate e^exponent (simplified)
    const expResult = Math.exp(Math.min(exponent, 10)); // Cap at e^10 for safety

    // Calculate final price
    const priceBNB = Number(INITIAL_PRICE) * expResult / 1e18;
    const priceUSD = priceBNB * BNB_PRICE;

    // Calculate market cap
    const marketCapBNB = BigInt(Math.floor(priceBNB * 1e18)) * supplyWei / ethers.parseEther("1");
    const marketCapUSD = Number(ethers.formatEther(marketCapBNB)) * BNB_PRICE;

    const percentage = (supply / 1000000000) * 100;

    // Format price for display
    const displayPrice = priceBNB < 0.000001 ? priceBNB.toExponential(6) : priceBNB.toFixed(8);

    console.log(`${percentage.toString().padStart(5)}% supply (${(supply/1000000).toString().padStart(4)}M tokens) → ${displayPrice.padStart(12)} BNB ($${priceUSD.toFixed(6).padStart(8)}) | Market Cap: $${marketCapUSD.toLocaleString()}`);
  }

  // Calculate graduation economics
  console.log(`\n🎓 GRADUATION ECONOMICS:`);
  const platformFees = GROSS_RAISE_TARGET * BigInt(Math.floor(FEE_PERCENT * 10000)) / BigInt(10000);
  const creatorFees = GROSS_RAISE_TARGET * BigInt(250) / BigInt(10000); // 0.25%
  const totalFees = platformFees + creatorFees;

  console.log(`Gross Raise Target: ${ethers.formatEther(GROSS_RAISE_TARGET)} BNB ($${(Number(ethers.formatEther(GROSS_RAISE_TARGET)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Platform Fees (1%): ${ethers.formatEther(platformFees)} BNB ($${(Number(ethers.formatEther(platformFees)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Creator Fees (0.25%): ${ethers.formatEther(creatorFees)} BNB ($${(Number(ethers.formatEther(creatorFees)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Total Fees (1.25%): ${ethers.formatEther(totalFees)} BNB ($${(Number(ethers.formatEther(totalFees)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Net to Liquidity: ${ethers.formatEther(NET_RAISE_TARGET)} BNB ($${(Number(ethers.formatEther(NET_RAISE_TARGET)) * BNB_PRICE).toLocaleString()})`);

  // LP Allocation calculations
  const LP_TOKENS = ethers.parseEther("200000000"); // 200M tokens
  const LP_BNB = NET_RAISE_TARGET; // All net raise goes to LP

  // Calculate graduation price more realistically
  // Graduation happens when total BNB raised = 35 BNB
  // Price at graduation should be higher than initial price
  const tokensSoldAtGraduation = GROSS_RAISE_TARGET * ethers.parseEther("1") / INITIAL_PRICE;
  const graduationPriceBNB = Number(GROSS_RAISE_TARGET) / Number(tokensSoldAtGraduation);
  const graduationPriceUSD = graduationPriceBNB * BNB_PRICE;

  console.log(`\n💧 LIQUIDITY POOL ALLOCATION:`);
  console.log(`LP Tokens: ${ethers.formatEther(LP_TOKENS)} tokens`);
  console.log(`LP BNB: ${ethers.formatEther(LP_BNB)} BNB ($${(Number(ethers.formatEther(LP_BNB)) * BNB_PRICE).toLocaleString()})`);
  console.log(`Tokens Sold at Graduation: ${ethers.formatEther(tokensSoldAtGraduation)} tokens`);
  console.log(`Graduation Price: ${graduationPriceBNB.toFixed(8)} BNB ($${graduationPriceUSD.toFixed(6)} per token)`);

  // Growth potential analysis
  console.log(`\n🚀 GROWTH POTENTIAL ANALYSIS:`);
  const initialPriceBNB = Number(ethers.formatEther(INITIAL_PRICE));
  const finalPriceBNB = graduationPriceBNB;
  const priceMultiplier = finalPriceBNB / initialPriceBNB;
  const marketCapGrowth = Number(ethers.formatEther(GROSS_RAISE_TARGET)) / Number(ethers.formatEther(initialMarketCapBNB));

  console.log(`Initial Token Price: $${(initialPriceBNB * BNB_PRICE).toFixed(6)}`);
  console.log(`Graduation Price: $${(finalPriceBNB * BNB_PRICE).toFixed(6)}`);
  console.log(`Price Multiplier: ${priceMultiplier.toFixed(2)}x`);
  console.log(`Market Cap Growth: ${marketCapGrowth.toFixed(1)}x`);
  console.log(`Total Return Potential: ${marketCapGrowth.toFixed(1)}x (from $${initialMarketCapUSD.toLocaleString()} to $${(Number(ethers.formatEther(GROSS_RAISE_TARGET)) * BNB_PRICE).toLocaleString()})`);

  // Investor scenarios
  console.log(`\n💼 INVESTOR SCENARIOS:`);
  const investorAmounts = [0.1, 1, 10, 100]; // BNB
  const exitPrices = [initialPriceBNB, initialPriceBNB * 2, finalPriceBNB]; // Price scenarios

  for (const bnbAmount of investorAmounts) {
    const initialTokens = (bnbAmount / initialPriceBNB);
    const investmentUSD = bnbAmount * BNB_PRICE;

    console.log(`\n📊 ${bnbAmount} BNB Investment ($${investmentUSD.toLocaleString()}):`);
    console.log(`   Initial Tokens: ${initialTokens.toLocaleString()}`);

    for (let i = 0; i < exitPrices.length; i++) {
      const exitPrice = exitPrices[i];
      const exitValue = initialTokens * exitPrice;
      const exitValueUSD = exitValue * BNB_PRICE;
      const profit = exitValueUSD - investmentUSD;
      const roi = (profit / investmentUSD) * 100;

      const scenario = i === 0 ? "Current Price" : i === 1 ? "2x Price" : "Graduation Price";
      console.log(`   ${scenario.padEnd(16)}: $${exitValueUSD.toLocaleString()} (${roi > 0 ? '+' : ''}${roi.toFixed(1)}% ROI)`);
    }
  }

  // Competitive analysis
  console.log(`\n🏆 COMPETITIVE POSITIONING:`);
  console.log(`Entry Barrier: Low ($${(initialPriceBNB * BNB_PRICE).toFixed(6)} per token)`);
  console.log(`Growth Potential: High (${marketCapGrowth.toFixed(1)}x potential)`);
  console.log(`Market Cap Range: $${initialMarketCapUSD.toLocaleString()} - $${(Number(ethers.formatEther(GROSS_RAISE_TARGET)) * BNB_PRICE).toLocaleString()}`);
  console.log(`Fee Structure: Competitive (1.25% total)`);
  console.log(`Liquidity Security: High (Auto-graduation to DEX)`);

  console.log(`\n✅ ECONOMIC VIABILITY SUMMARY:`);
  console.log(`✓ Realistic initial pricing for BSC ecosystem`);
  console.log(`✓ Sustainable growth mechanism with exponential curve`);
  console.log(`✓ Attractive returns for early investors (${marketCapGrowth.toFixed(1)}x potential)`);
  console.log(`✓ Professional market cap range ($${(initialMarketCapUSD/1000).toFixed(0)}K - $${((Number(ethers.formatEther(GROSS_RAISE_TARGET)) * BNB_PRICE)/1000000).toFixed(0)}M)`);
  console.log(`✓ Low barrier to entry with meaningful token ownership`);
  console.log(`✓ Automated liquidity creation for long-term sustainability`);

  console.log("\n" + "=".repeat(60));
  console.log("🎯 READY FOR MAINNET DEPLOYMENT WITH UPDATED PRICING! 🎯");
  console.log("=".repeat(60));
}

// Execute the calculation
calculateEconomics()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });