const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Production Deployment to BSC Mainnet...");

  // Verify network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  if (network.chainId !== 56) {
    throw new Error("❌ Please switch to BSC Mainnet (Chain ID: 56)");
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.utils.formatEther(balance)} BNB`);

  const minBalance = ethers.utils.parseEther("0.5");
  if (balance.lt(minBalance)) {
    throw new Error("❌ Insufficient balance for deployment. Need at least 0.5 BNB");
  }

  // Calculate deployment costs
  const deploymentCost = ethers.utils.parseEther("0.3");
  console.log(`Estimated deployment cost: ${ethers.utils.formatEther(deploymentCost)} BNB`);

  // Deploy AhiruToken with production parameters
  console.log("\n📄 Deploying AhiruToken...");
  const TokenFactory = await ethers.getContractFactory("AhiruToken");

  const tokenArgs = [
    "Ahiru Token",           // name
    "AHIRU",                 // symbol
    ethers.utils.parseUnits("1000000000", 18), // 1B tokens supply
    deployer.address         // owner
  ];

  const tokenContract = await TokenFactory.deploy(...tokenArgs);
  await tokenContract.deployed();

  console.log(`✅ AhiruToken deployed: ${tokenContract.address}`);

  // Deploy AhiruLaunchpad with production parameters
  console.log("\n🚀 Deploying AhiruLaunchpad...");
  const LaunchpadFactory = await ethers.getContractFactory("AhiruLaunchpad");

  const launchpadArgs = [
    tokenContract.address,                           // token address
    ethers.utils.parseUnits("100000000", 18),        // 100M tokens for platform
    ethers.utils.parseUnits("1000000", 18),          // 1M tokens for creation
    ethers.utils.parseEther("0.01"),                 // 0.01 BNB creation fee
    200,                                            // 2% platform fee
    ethers.utils.parseEther("1"),                    // 1 BNB soft cap
    ethers.utils.parseEther("10"),                   // 10 BNB hard cap
    3600                                            // 1 hour trading delay
  ];

  const launchpadContract = await LaunchpadFactory.deploy(...launchpadArgs);
  await launchpadContract.deployed();

  console.log(`✅ AhiruLaunchpad deployed: ${launchpadContract.address}`);

  // Transfer platform tokens to launchpad
  console.log("\n💰 Transferring platform tokens to launchpad...");
  const transferTx = await tokenContract.transfer(
    launchpadContract.address,
    ethers.utils.parseUnits("100000000", 18)
  );
  await transferTx.wait();

  console.log("✅ Platform tokens transferred successfully");

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");

  // Enable trading on launchpad
  await launchpadContract.setTradingEnabled(true);
  console.log("✅ Trading enabled");

  // Set platform fee recipient
  await launchpadContract.setFeeRecipient(deployer.address);
  console.log(`✅ Fee recipient set to: ${deployer.address}`);

  // Get deployment info
  const finalTokenBalance = await tokenContract.balanceOf(launchpadContract.address);
  const ownerBalance = await tokenContract.balanceOf(deployer.address);

  console.log("\n📊 Deployment Summary:");
  console.log("========================");
  console.log(`📄 AhiruToken: ${tokenContract.address}`);
  console.log(`🚀 AhiruLaunchpad: ${launchpadContract.address}`);
  console.log(`💰 Platform tokens in launchpad: ${ethers.utils.formatUnits(finalTokenBalance, 18)}`);
  console.log(`👛 Owner tokens: ${ethers.utils.formatUnits(ownerBalance, 18)}`);
  console.log(`🏢 Deployer: ${deployer.address}`);
  console.log(`⛽ Gas used: ${ethers.utils.formatEther(deploymentCost)} BNB`);

  // Save deployment info
  const deploymentInfo = {
    network: "bsc-mainnet",
    chainId: 56,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AhiruToken: {
        address: tokenContract.address,
        deploymentHash: tokenContract.deployTransaction.hash
      },
      AhiruLaunchpad: {
        address: launchpadContract.address,
        deploymentHash: launchpadContract.deployTransaction.hash
      }
    },
    gasUsed: deploymentCost.toString(),
    finalBalances: {
      platformTokens: finalTokenBalance.toString(),
      ownerTokens: ownerBalance.toString()
    }
  };

  // Write deployment info to file
  const fs = require('fs');
  fs.writeFileSync(
    'deployments/production.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 Production deployment completed successfully!");
  console.log("📝 Deployment info saved to: deployments/production.json");
  console.log("\n⚠️ IMPORTANT: Update frontend contracts.ts with new addresses");
  console.log("⚠️ IMPORTANT: Run contract verification on BscScan");

  // Prepare verification commands
  console.log("\n📋 Contract Verification Commands:");
  console.log("===============================");
  console.log(`npx hardhat verify --network bsc-mainnet ${tokenContract.address} "${tokenArgs.join('" "')}"`);
  console.log(`npx hardhat verify --network bsc-mainnet ${launchpadContract.address} "${launchpadArgs.join('" "')}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });