#!/usr/bin/env node

/**
 * Rabbit Launchpad Testnet Deployment Script
 *
 * Simplified deployment script for BSC Testnet
 */

const { ethers } = require("hardhat");
require("dotenv").config({ path: "../.env.testnet" });

async function deployToTestnet() {
  console.log("🧪 Deploying Rabbit Launchpad to BSC Testnet");

  // Network configuration
  const TESTNET_CONFIG = {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
    addresses: {
      PANCAKE_ROUTER: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
      WBNB: "0xae13d989daC2Ed0d23529a5a5204a7C997a4f1f1",
      TREASURY: process.env.TREASURY_TESTNET_ADDRESS || "0x4edDe3C550879e3B97D309eC765cb02c5bCf6db7"
    }
  };

  const DEPLOY_PARAMS = {
    CREATION_FEE: ethers.parseEther("0.005"),
    MIN_LIQUIDITY: ethers.parseEther("1"),
    MAX_TOKENS: 1000
  };

  try {
    // Validate environment
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not set in .env.testnet");
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log(`👛 Deployer: ${wallet.address}`);

    // Check balance
    const balance = await wallet.provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`);

    // Deploy RabbitToken
    console.log("🪙 Deploying RabbitToken...");
    const RabbitToken = await ethers.getContractFactory("RabbitToken");
    const rabbitToken = await RabbitToken.deploy();
    await rabbitToken.waitForDeployment();
    console.log(`✅ RabbitToken: ${rabbitToken.target}`);

    // Deploy RabbitLaunchpad
    console.log("🚀 Deploying RabbitLaunchpad...");
    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad");
    const rabbitLaunchpad = await RabbitLaunchpad.deploy(
      TESTNET_CONFIG.addresses.TREASURY,
      TESTNET_CONFIG.addresses.PANCAKE_ROUTER,
      TESTNET_CONFIG.addresses.WBNB,
      { value: DEPLOY_PARAMS.CREATION_FEE }
    );
    await rabbitLaunchpad.waitForDeployment();
    console.log(`✅ RabbitLaunchpad: ${rabbitLaunchpad.target}`);

    // Create test token
    console.log("🎯 Creating test token...");
    const tx = await rabbitLaunchpad.createToken(
      "Rabbit Test Token",
      "RABBITTEST",
      "Test token for Rabbit Launchpad",
      { value: DEPLOY_PARAMS.CREATION_FEE }
    );
    const receipt = await tx.wait();

    // Get token address from event
    const event = receipt.logs.find(log =>
      log.fragment && log.fragment.name === "TokenCreated"
    );
    const tokenAddress = event.args[0];
    console.log(`✅ Test Token: ${tokenAddress}`);

    // Verify deployment
    const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Symbol: ${tokenInfo.symbol}`);

    console.log("\n🎉 Testnet deployment complete!");
    console.log(`📊 Explorer: ${TESTNET_CONFIG.explorer}/address/${rabbitLaunchpad.target}`);

    return {
      rabbitToken: rabbitToken.target,
      rabbitLaunchpad: rabbitLaunchpad.target,
      testToken: tokenAddress,
      network: TESTNET_CONFIG
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

if (require.main === module) {
  deployToTestnet()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}