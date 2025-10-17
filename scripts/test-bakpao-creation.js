/**
 * Test Script untuk Membuat Token "Bakpao" dan Testing Flow Lengkap
 *
 * Usage: node scripts/test-bakpao-creation.js
 *
 * This script will:
 * 1. Deploy RabbitLaunchpad contract
 * 2. Create "Bakpao" token
 * 3. Test buy functionality
 * 4. Test sell functionality
 * 5. Verify all states
 */

const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🥟 Starting Bakpao Token Flow Test...\n");

  // Get deployer account
  const [deployer, buyer1, buyer2] = await ethers.getSigners();
  console.log("📋 Accounts:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Buyer 1: ${buyer1.address}`);
  console.log(`  Buyer 2: ${buyer2.address}\n`);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  try {
    // Step 1: Deploy RabbitLaunchpad
    console.log("🚀 Step 1: Deploying RabbitLaunchpad Contract...");

    // Use testnet treasury address (or deployer address for testing)
    const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;

    // PancakeSwap Router address based on network
    let pancakeswapRouter;
    if (network.chainId === 97n) { // BSC Testnet
      pancakeswapRouter = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
    } else if (network.chainId === 56n) { // BSC Mainnet
      pancakeswapRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    } else {
      // For local testing, use a mock address
      pancakeswapRouter = "0x0000000000000000000000000000000000000000";
      console.log("⚠️  Using mock DEX router for local testing");
    }

    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad");
    const launchpad = await RabbitLaunchpad.deploy(
      treasuryAddress,
      pancakeswapRouter
    );

    await launchpad.waitForDeployment();
    const launchpadAddress = await launchpad.getAddress();

    console.log(`✅ RabbitLaunchpad deployed at: ${launchpadAddress}\n`);

    // Step 2: Create Bakpao Token
    console.log("🥟 Step 2: Creating Bakpao Token...");

    const CREATE_FEE = ethers.parseEther("0.005"); // 0.005 BNB
    const tokenName = "Bakpao Token";
    const tokenSymbol = "BAKPAO";
    const tokenMetadata = "https://ipfs.io/ipfs/QmExampleBakpaoMetadata.json";

    const createTx = await launchpad.createToken(
      tokenName,
      tokenSymbol,
      tokenMetadata,
      { value: CREATE_FEE }
    );

    const createReceipt = await createTx.wait();
    console.log(`✅ Bakpao token creation tx: ${createTx.hash}`);

    // Get token address from event
    const tokenCreatedEvent = createReceipt.logs.find(log => {
      try {
        const parsed = launchpad.interface.parseLog(log);
        return parsed.name === 'TokenCreated';
      } catch (e) {
        return false;
      }
    });

    let bakpaoTokenAddress;
    if (tokenCreatedEvent) {
      const parsed = launchpad.interface.parseLog(tokenCreatedEvent);
      bakpaoTokenAddress = parsed.args.tokenAddress;
    } else {
      // Fallback: get from token list
      const allTokens = await launchpad.getAllTokens();
      bakpaoTokenAddress = allTokens[allTokens.length - 1];
    }

    console.log(`✅ Bakpao Token Address: ${bakpaoTokenAddress}\n`);

    // Get token contract instance
    const BakpaoToken = await ethers.getContractFactory("RabbitToken");
    const bakpaoToken = BakpaoToken.attach(bakpaoTokenAddress);

    // Step 3: Verify Token Info
    console.log("📊 Step 3: Verifying Token Information...");

    const tokenInfo = await launchpad.getTokenInfo(bakpaoTokenAddress);
    console.log(`  Name: ${tokenInfo.name}`);
    console.log(`  Symbol: ${tokenInfo.symbol}`);
    console.log(`  Creator: ${tokenInfo.creator}`);
    console.log(`  Metadata: ${tokenInfo.metadata}`);
    console.log(`  Initial Price: ${ethers.formatEther(tokenInfo.initialPrice)} BNB`);
    console.log(`  Total Supply: ${ethers.formatEther(await bakpaoToken.totalSupply())}`);
    console.log(`  Graduated: ${tokenInfo.graduated}\n`);

    // Step 4: Test Token Purchase
    console.log("💰 Step 4: Testing Token Purchase...");

    // Buyer 1 purchases 0.1 BNB worth of tokens
    const buyAmount1 = ethers.parseEther("0.1");
    console.log(`  Buyer 1 buying ${ethers.formatEther(buyAmount1)} BNB worth of tokens...`);

    const initialBuyer1Balance = await bakpaoToken.balanceOf(buyer1.address);
    const buyTx1 = await launchpad.connect(buyer1).buy(bakpaoTokenAddress, {
      value: buyAmount1
    });

    const buyReceipt1 = await buyTx1.wait();
    console.log(`  ✅ Purchase tx: ${buyTx1.hash}`);

    const finalBuyer1Balance = await bakpaoToken.balanceOf(buyer1.address);
    const tokensReceived1 = finalBuyer1Balance - initialBuyer1Balance;
    console.log(`  ✅ Tokens received: ${ethers.formatEther(tokensReceived1)} BAKPAO\n`);

    // Step 5: Test Token Sale
    console.log("💸 Step 5: Testing Token Sale...");

    // Buyer 1 sells half of their tokens
    const sellAmount1 = tokensReceived1 / 2n;
    console.log(`  Buyer 1 selling ${ethers.formatEther(sellAmount1)} BAKPAO tokens...`);

    const initialBuyer1BNB = await ethers.provider.getBalance(buyer1.address);

    // First approve the launchpad to spend tokens
    const approveTx = await bakpaoToken.connect(buyer1).approve(
      launchpadAddress,
      sellAmount1
    );
    await approveTx.wait();

    // Then sell the tokens
    const sellTx1 = await launchpad.connect(buyer1).sell(
      bakpaoTokenAddress,
      sellAmount1
    );

    const sellReceipt1 = await sellTx1.wait();
    console.log(`  ✅ Sale tx: ${sellTx1.hash}`);

    const finalBuyer1BNB = await ethers.provider.getBalance(buyer1.address);
    const bnbReceived1 = finalBuyer1BNB - initialBuyer1BNB;
    console.log(`  ✅ BNB received: ${ethers.formatEther(bnbReceived1)} BNB\n`);

    // Step 6: Test Price Calculation
    console.log("📈 Step 6: Testing Bonding Curve Calculations...");

    const currentPrice = await launchpad.calculatePrice(tokenInfo.soldSupply);
    const bondingStats = await launchpad.getBondingCurveStats(bakpaoTokenAddress);

    console.log(`  Current Price: ${ethers.formatEther(currentPrice)} BNB per token`);
    console.log(`  Market Cap: ${ethers.formatEther(bondingStats.marketCap)} BNB`);
    console.log(`  Progress to Graduation: ${bondingStats.progress / 100}%\n`);

    // Step 7: Test Multiple Buyers
    console.log("👥 Step 7: Testing Multiple Buyers...");

    // Buyer 2 purchases
    const buyAmount2 = ethers.parseEther("0.05");
    console.log(`  Buyer 2 buying ${ethers.formatEther(buyAmount2)} BNB worth of tokens...`);

    const buyTx2 = await launchpad.connect(buyer2).buy(bakpaoTokenAddress, {
      value: buyAmount2
    });

    await buyTx2.wait();
    console.log(`  ✅ Buyer 2 purchase tx: ${buyTx2.hash}`);

    const buyer2Balance = await bakpaoToken.balanceOf(buyer2.address);
    console.log(`  ✅ Buyer 2 tokens: ${ethers.formatEther(buyer2Balance)} BAKPAO\n`);

    // Step 8: Final State Verification
    console.log("🔍 Step 8: Final State Verification...");

    const finalTokenInfo = await launchpad.getTokenInfo(bakpaoTokenAddress);
    const finalBondingStats = await launchpad.getBondingCurveStats(bakpaoTokenAddress);

    console.log(`  Total Sold Supply: ${ethers.formatEther(finalTokenInfo.soldSupply)} tokens`);
    console.log(`  Total BNB Raised: ${ethers.formatEther(finalTokenInfo.totalBNB)} BNB`);
    console.log(`  Platform Fees: ${ethers.formatEther(finalTokenInfo.totalPlatformFees)} BNB`);
    console.log(`  Creator Fees: ${ethers.formatEther(finalTokenInfo.totalCreatorFees)} BNB`);
    console.log(`  Current Price: ${ethers.formatEther(currentPrice)} BNB`);
    console.log(`  Market Cap: ${ethers.formatEther(finalBondingStats.marketCap)} BNB`);
    console.log(`  Graduation Progress: ${finalBondingStats.progress / 100}%`);

    // Check graduation criteria
    const GROSS_RAISE_TARGET = ethers.parseEther("35"); // 35 BNB
    const isGraduated = finalTokenInfo.totalBNB >= GROSS_RAISE_TARGET;
    console.log(`  Ready for Graduation: ${isGraduated ? '✅ YES' : '❌ NO'}`);

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: Number(network.chainId),
      launchpadAddress: launchpadAddress,
      bakpaoTokenAddress: bakpaoTokenAddress,
      treasuryAddress: treasuryAddress,
      pancakeswapRouter: pancakeswapRouter,
      tokenInfo: {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        creator: tokenInfo.creator,
        totalSold: ethers.formatEther(finalTokenInfo.soldSupply),
        totalBNB: ethers.formatEther(finalTokenInfo.totalBNB),
        currentPrice: ethers.formatEther(currentPrice),
        marketCap: ethers.formatEther(finalBondingStats.marketCap),
        graduated: isGraduated
      },
      transactions: {
        deployment: launchpad.deploymentTransaction().hash,
        tokenCreation: createTx.hash,
        buyer1Purchase: buyTx1.hash,
        buyer1Sale: sellTx1.hash,
        buyer2Purchase: buyTx2.hash
      },
      testedAt: new Date().toISOString()
    };

    const fs = require("fs");
    const deploymentDir = "test-deployments";
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir);
    }

    fs.writeFileSync(
      `${deploymentDir}/bakpao-test-${network.name}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n📁 Test results saved to: ${deploymentDir}/bakpao-test-${network.name}.json\n`);

    // Success message
    console.log("🎉 Bakpao Token Flow Test Completed Successfully!");
    console.log("🥟 Bakpao token is ready for trading!\n");

    // Display frontend URLs
    console.log("🌐 Frontend URLs:");
    console.log(`  Token Detail: http://localhost:8080/token/${bakpaoTokenAddress}`);
    console.log(`  Trading Page: http://localhost:8080/token/${bakpaoTokenAddress}#trading\n`);

    // Display explorer URLs
    let explorerUrl;
    if (network.chainId === 97n) {
      explorerUrl = "https://testnet.bscscan.com";
    } else if (network.chainId === 56n) {
      explorerUrl = "https://bscscan.com";
    } else {
      explorerUrl = "https://etherscan.io";
    }

    console.log("🔍 Blockchain Explorer:");
    console.log(`  Launchpad Contract: ${explorerUrl}/address/${launchpadAddress}`);
    console.log(`  Bakpao Token: ${explorerUrl}/address/${bakpaoTokenAddress}`);
    console.log(`  Token Creation: ${explorerUrl}/tx/${createTx.hash}`);

    return deploymentInfo;

  } catch (error) {
    console.error("❌ Error during Bakpao token test:", error);
    process.exit(1);
  }
}

// Execute the test
main()
  .then(() => {
    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });