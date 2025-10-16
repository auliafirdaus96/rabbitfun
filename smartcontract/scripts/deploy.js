#!/usr/bin/env node

const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Rabbit Launchpad Production Deployment Script
 *
 * This script deploys the Rabbit Launchpad smart contracts to production
 * with comprehensive validation and verification.
 */

const DEPLOYMENT_CONFIG = {
  // Network configurations
  BSC_MAINNET: {
    name: "BSC Mainnet",
    chainId: 56,
    rpcUrl: process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed1.binance.org/",
    explorer: "https://bscscan.com"
  },
  BSC_TESTNET: {
    name: "BSC Testnet",
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com"
  }
};

const PRODUCTION_ADDRESSES = {
  BSC_MAINNET: {
    PANCAKE_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    TREASURY: process.env.TREASURY_ADDRESS // Must be set in .env
  },
  BSC_TESTNET: {
    PANCAKE_ROUTER: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    WBNB: "0xae13d989daC2Ed0d23529a5a5204a7C997a4f1f1",
    TREASURY: process.env.TREASURY_TESTNET_ADDRESS || "0x4edDe3C550879e3B97D309eC765cb02c5bCf6db7"
  }
};

const PRODUCTION_PARAMS = {
  CREATION_FEE: ethers.parseEther("0.005"), // 0.005 BNB
  MIN_LIQUIDITY: ethers.parseEther("1"), // 1 BNB
  MAX_TOKENS: 1000,
  GRADUATION_THRESHOLD: ethers.parseEther("200000"), // 200K tokens
  FEES: {
    PLATFORM_RATE: 100, // 1%
    CREATOR_RATE: 25  // 0.25%
  }
};

/**
 * Validates deployment environment
 */
function validateEnvironment() {
  console.log("🔍 Validating deployment environment...");

  // Required environment variables
  const requiredVars = ["PRIVATE_KEY", "TREASURY_ADDRESS"];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    process.exit(1);
  }

  // Validate private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith("0x") || privateKey.length !== 66) {
    console.error("❌ Invalid PRIVATE_KEY format");
    process.exit(1);
  }

  // Validate treasury address
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  if (!ethers.isAddress(treasuryAddress)) {
    console.error("❌ Invalid TREASURY_ADDRESS");
    process.exit(1);
  }

  // Validate BNB balance
  const wallet = new ethers.Wallet(privateKey);
  console.log(`👛 Deployment wallet: ${wallet.address}`);

  console.log("✅ Environment validation passed");
}

/**
 * Gets deployment configuration based on environment
 */
function getDeploymentConfig() {
  const network = process.env.NETWORK || "BSC_TESTNET";

  if (!DEPLOYMENT_CONFIG[network]) {
    console.error(`❌ Unsupported network: ${network}`);
    console.error("Supported networks: BSC_MAINNET, BSC_TESTNET");
    process.exit(1);
  }

  return {
    network: DEPLOYMENT_CONFIG[network],
    addresses: PRODUCTION_ADDRESSES[network],
    networkName: network
  };
}

/**
 * Estimates deployment costs
 */
async function estimateDeploymentCosts(network) {
  console.log("💰 Estimating deployment costs...");

  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  // Estimated gas costs
  const gasPrice = await deployer.provider.getFeeData();
  const estimatedGasCosts = {
    RabbitToken: 2_000_000, // ~2M gas
    RabbitLaunchpad: 4_500_000, // ~4.5M gas
    Verification: 0.01 // 0.01 BNB for BSCScan verification
  };

  const totalGas = estimatedGasCosts.RabbitToken + estimatedGasCosts.RabbitLaunchpad;
  const totalBnbCost = Number(gasPrice.gasPrice) * totalGas / 1e18;

  const verificationCost = network.networkName === "BSC_MAINNET" ? 0.01 : 0; // BSC Testnet is free

  const totalCost = totalBnbCost + verificationCost;

  console.log(`   Wallet Balance: ${ethers.formatEther(balance)} BNB`);
  console.log(`   Estimated Deployment Cost: ${totalCost.toFixed(4)} BNB`);
  console.log(`   Remaining After Deployment: ${(ethers.formatEther(balance) - totalCost).toFixed(4)} BNB`);

  if (balance < totalCost) {
    console.error("❌ Insufficient balance for deployment");
    process.exit(1);
  }

  return { totalCost, gasPrice };
}

/**
 * Deploys RabbitToken contract
 */
async function deployRabbitToken(deployer, network) {
  console.log("🪙 Deploying RabbitToken contract...");

  const RabbitToken = await ethers.getContractFactory("RabbitToken");
  const rabbitToken = await RabbitToken.connect(deployer).deploy();

  console.log(`   RabbitToken deployed to: ${rabbitToken.target}`);
  console.log(`   Transaction hash: ${rabbitToken.deploymentTransaction().hash}`);

  console.log("⏳ Waiting for confirmations...");
  await rabbitToken.waitForDeployment();

  // Initial token supply check
  const totalSupply = await rabbitToken.totalSupply();
  console.log(`   Initial supply: ${ethers.formatEther(totalSupply)} tokens`);

  return rabbitToken;
}

/**
 * Deploys RabbitLaunchpad contract
 */
async function deployRabbitLaunchpad(deployer, network, rabbitToken) {
  console.log("🚀 Deploying RabbitLaunchpad contract...");

  const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad");

  const rabbitLaunchpad = await RabbitLaunchpad.connect(deployer).deploy(
    network.addresses.TREASURY,
    network.addresses.PANCAKE_ROUTER,
    network.addresses.WBNB,
    { value: PRODUCTION_PARAMS.CREATION_FEE }
  );

  console.log(`   RabbitLaunchpad deployed to: ${rabbitLaunchpad.target}`);
  console.log(`   Transaction hash: ${rabbitLaunchpad.deploymentTransaction().hash}`);

  console.log("⏳ Waiting for confirmations...");
  await rabbitLaunchpad.waitForDeployment();

  // Verify configuration
  const treasury = await rabbitLaunchpad.treasury();
  const pancakeRouter = await rabbitLaunchpad.PANCAKE_ROUTER();
  const wbnb = await rabbitLaunchpad.WBNB();

  console.log(`   Treasury: ${treasury}`);
  console.log(`   PancakeSwap Router: ${pancakeRouter}`);
  console.log(`   WBNB: ${wnbn}`);

  return rabbitLaunchpad;
}

/**
 * Initializes token with initial liquidity
 */
async function initializeToken(rabbitLaunchpad, rabbitToken, deployer, network) {
  console.log("💧 Initializing token with initial liquidity...");

  const creationFee = PRODUCTION_PARAMS.CREATION_FEE;

  // Create token
  const tx = await rabbitLaunchpad.connect(deployer).createToken(
    "Rabbit Token",
    "RABBIT",
    "The first Rabbit Launchpad token",
    { value: creationFee }
  );

  console.log(`   Token creation transaction: ${tx.hash}`);

  console.log("⏳ Waiting for token creation confirmation...");
  const receipt = await tx.wait();

  // Get token address from event
  const event = receipt.logs.find(log =>
    log.fragment && log.fragment.name === "TokenCreated"
  );

  if (!event) {
    console.error("❌ Could not find TokenCreated event");
    process.exit(1);
  }

  const tokenAddress = event.args[0];
  console.log(`   Token created at: ${tokenAddress}`);

  // Verify token configuration
  const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
  console.log(`   Token name: ${tokenInfo.name}`);
  console.log(`   Token symbol: ${tokenInfo.symbol}`);
  console.log(`   Initial price: ${ethers.formatEther(tokenInfo.initialPrice)} BNB`);

  return { tokenAddress, tokenInfo };
}

/**
 * Verifies contracts on block explorer
 */
async function verifyContracts(network, rabbitToken, rabbitLaunchpad) {
  console.log("🔍 Verifying contracts on block explorer...");

  if (network.networkName === "BSC_TESTNET") {
    console.log("   BSC Testnet verification skipped (automatic)");
    return;
  }

  const hre = require("hardhat");

  try {
    // Verify RabbitToken
    console.log("   Verifying RabbitToken...");
    await hre.run("verify:verify", {
      address: rabbitToken.target,
      constructorArguments: []
    });

    // Verify RabbitLaunchpad
    console.log("   Verifying RabbitLaunchpad...");
    await hre.run("verify:verify", {
      address: rabbitLaunchpad.target,
      constructorArguments: [
        network.addresses.TREASURY,
        network.addresses.PANCAKE_ROUTER,
        network.addresses.WBNB
      ]
    });

    console.log("✅ Contracts verified successfully");
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
    console.log("   You may need to verify manually on the block explorer");
  }
}

/**
 * Generates deployment artifacts
 */
function generateDeploymentArtifacts(deploymentResult, network) {
  console.log("📝 Generating deployment artifacts...");

  const artifacts = {
    network: network.networkName,
    timestamp: new Date().toISOString(),
    contracts: {
      RabbitToken: {
        address: deploymentResult.rabbitToken.target,
        transactionHash: deploymentResult.rabbitToken.deploymentTransaction().hash,
        blockNumber: deploymentResult.rabbitToken.deploymentTransaction().blockNumber,
        gasUsed: deploymentResult.rabbitToken.deploymentTransaction().gasUsed
      },
      RabbitLaunchpad: {
        address: deploymentResult.rabbitLaunchpad.target,
        transactionHash: deploymentResult.rabbitLaunchpad.deploymentTransaction().hash,
        blockNumber: deploymentResult.rabbitLaunchpad.deploymentTransaction().blockNumber,
        gasUsed: deploymentResult.rabbitLaunchpad.deploymentTransaction().gasUsed
      }
    },
    configuration: {
      treasury: deploymentResult.treasury,
      pancakeRouter: deploymentResult.pancakeRouter,
      wbnb: deploymentResult.wbnb,
      creationFee: ethers.formatEther(PRODUCTION_PARAMS.CREATION_FEE),
      minLiquidity: ethers.formatEther(PRODUCTION_PARAMS.MIN_LIQUIDITY),
      maxTokens: PRODUCTION_PARAMS.MAX_TOKENS,
      graduationThreshold: ethers.formatEther(PRODUCTION_PARAMS.GRADUATION_THRESHOLD)
    },
    deployedToken: {
      address: deploymentResult.tokenAddress,
      name: deploymentResult.tokenInfo.name,
      symbol: deploymentResult.tokenInfo.symbol,
      initialPrice: ethers.formatEther(deploymentResult.tokenInfo.initialPrice),
      creator: deploymentResult.tokenInfo.creator
    },
    costs: deploymentResult.costs
  };

  // Save to file
  const fs = require("fs");
  const path = require("path");

  const deploymentDir = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const fileName = `deployment-${network.networkName.toLowerCase()}-${Date.now()}.json`;
  const filePath = path.join(deploymentDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(artifacts, null, 2));

  console.log(`   Deployment artifacts saved to: ${filePath}`);

  // Save latest deployment
  const latestPath = path.join(deploymentDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(artifacts, null, 2));

  return artifacts;
}

/**
 * Sends deployment notifications
 */
async function sendNotifications(artifacts, network) {
  console.log("📧 Sending deployment notifications...");

  // Log deployment summary
  console.log("\n" + "=".repeat(50));
  console.log("🎉 RABBIT LAUNCHPAD DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log(`Network: ${network.networkName}`);
  console.log(`Timestamp: ${artifacts.timestamp}`);
  console.log("");
  console.log("📋 Deployed Contracts:");
  console.log(`   RabbitToken: ${artifacts.contracts.RabbitToken.address}`);
  console.log(`   RabbitLaunchpad: ${artifacts.contracts.RabbitLaunchpad.address}`);
  console.log("");
  console.log("📋 Deployed Token:");
  console.log(`   Address: ${artifacts.deployedToken.address}`);
  console.log(`   Name: ${artifacts.deployedToken.name}`);
  console.log(`   Symbol: ${artifacts.deployedToken.symbol}`);
  console.log(`   Creator: ${artifacts.deployedToken.creator}`);
  console.log("");
  console.log("🔗 Block Explorer:");
  console.log(`   RabbitToken: ${network.explorer}/token/${artifacts.contracts.RabbitToken.address}`);
  console.log(`   RabbitLaunchpad: ${network.explorer}/address/${artifacts.contracts.RabbitLaunchpad.address}`);
  console.log("=".repeat(50));

  // Discord notification (if webhook configured)
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const axios = require("axios");

      const embed = {
        title: "🎉 Rabbit Launchpad Deployment Complete",
        description: `Successfully deployed to ${network.networkName}`,
        color: 0x00ff00,
        fields: [
          { name: "Network", value: network.networkName },
          { name: "RabbitToken", value: artifacts.contracts.RabbitToken.address },
          { name: "RabbitLaunchpad", value: artifacts.contracts.RabbitLaunchpad.address },
          { name: "Deployed Token", value: artifacts.deployedToken.symbol },
          { name: "Total Cost", value: `${artifacts.costs.totalCost.toFixed(4)} BNB` }
        ],
        timestamp: new Date().toISOString()
      };

      await axios.post(process.env.DISCORD_WEBHOOK_URL, { embeds: [embed] });
      console.log("✅ Discord notification sent");
    } catch (error) {
      console.log("⚠️ Could not send Discord notification");
    }
  }

  // Twitter notification (if configured)
  if (process.env.TWITTER_API_KEY && process.env.TWITTER_SECRET) {
    console.log("🐦 Twitter notification configured (would need Twitter API implementation)");
  }
}

/**
 * Main deployment function
 */
async function main() {
  console.log("🚀 Starting Rabbit Launchpad Production Deployment");
  console.log("=" * 50);

  try {
    // Validate environment
    validateEnvironment();

    // Get configuration
    const config = getDeploymentConfig();
    console.log(`📡 Deploying to: ${config.network.name} (${config.network.chainId})`);

    // Connect to network
    const provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const deployer = wallet;

    // Estimate costs
    const costs = await estimateDeploymentCosts(config.network);

    // Deploy contracts
    console.log("\n📦 Deploying contracts...");

    const rabbitToken = await deployRabbitToken(deployer, config);
    const rabbitLaunchpad = await deployRabbitLaunchpad(deployer, config, rabbitToken);

    // Initialize token
    console.log("\n🎯 Initializing token...");
    const tokenDeployment = await initializeToken(rabbitLaunchpad, rabbitToken, deployer, config);

    // Verify contracts
    console.log("\n🔍 Verifying contracts...");
    await verifyContracts(config, rabbitToken, rabbitLaunchpad);

    // Generate artifacts
    console.log("\n📝 Generating deployment artifacts...");
    const artifacts = generateDeploymentArtifacts({
      rabbitToken,
      rabbitLaunchpad,
      tokenAddress: tokenDeployment.tokenAddress,
      tokenInfo: tokenDeployment.tokenInfo,
      treasury: config.addresses.TREASURY,
      pancakeRouter: config.addresses.PANCAKE_ROUTER,
      wbnb: config.addresses.WBNB,
      costs
    }, config);

    // Send notifications
    console.log("\n📢 Sending notifications...");
    await sendNotifications(artifacts, config);

    console.log("\n✅ Deployment completed successfully!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  validateEnvironment,
  getDeploymentConfig,
  estimateDeploymentCosts,
  deployRabbitToken,
  deployRabbitLaunchpad,
  initializeToken,
  verifyContracts,
  generateDeploymentArtifacts
};