import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  gasUsed: string;
  blockNumber: number;
  deployer: string;
  network: string;
  deploymentTime: string;
}

/**
 * Deploy RabbitLaunchpad to BSC Testnet
 */
async function main() {
  console.log("🚀 Starting RabbitLaunchpad Deployment to BSC Testnet");
  console.log("=" * 60);

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);

  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);

  // Verify we're on testnet
  if (chainId !== 97) {
    console.log("⚠️  Warning: You are not on BSC Testnet (Chain ID: 97)");
    console.log("Current Chain ID:", chainId);
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`);

  // Check minimum balance requirement (0.1 BNB for deployment)
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least ${ethers.formatEther(minBalance)} BNB for deployment`);
  }

  // Deployment configuration
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployerAddress;
  const dexRouterAddress = process.env.PANCAKESWAP_ROUTER_TESTNET || "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

  console.log("⚙️ Deployment Configuration:");
  console.log(`   Treasury: ${treasuryAddress}`);
  console.log(`   DEX Router: ${dexRouterAddress}`);

  // Validate addresses
  if (!ethers.isAddress(treasuryAddress)) {
    throw new Error("Invalid treasury address");
  }
  if (!ethers.isAddress(dexRouterAddress)) {
    throw new Error("Invalid DEX router address");
  }

  try {
    // Get contract factory
    console.log("\n🔨 Loading RabbitLaunchpad contract...");
    const contractFactory = await ethers.getContractFactory("RabbitLaunchpad");

    // Deploy contract
    console.log("\n🚀 Deploying RabbitLaunchpad to BSC Testnet...");
    console.log(`   This may take 30-60 seconds...`);

    const contract = await contractFactory.deploy(treasuryAddress, dexRouterAddress, {
      gasLimit: 8000000,
      gasPrice: ethers.parseUnits("20", "gwei")
    });

    console.log("⏳ Transaction submitted. Waiting for confirmation...");
    console.log(`   Transaction: ${contract.deploymentTransaction()?.hash}`);

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    const deploymentTransaction = contract.deploymentTransaction();
    const receipt = await deploymentTransaction?.wait();

    const result: DeploymentResult = {
      contractAddress,
      transactionHash: deploymentTransaction?.hash || "",
      gasUsed: receipt?.gasUsed.toString() || "0",
      blockNumber: receipt?.blockNumber || 0,
      deployer: deployerAddress,
      network: networkName,
      deploymentTime: new Date().toISOString()
    };

    console.log("\n✅ RabbitLaunchpad deployed successfully to BSC Testnet!");
    console.log("=" * 60);
    console.log(`📍 Contract Address: ${result.contractAddress}`);
    console.log(`🔗 Transaction: ${result.transactionHash}`);
    console.log(`⛽ Gas Used: ${result.gasUsed}`);
    console.log(`📦 Block: ${result.blockNumber}`);
    console.log(`🕐 Deployed At: ${result.deploymentTime}`);

    // Calculate deployment cost
    if (receipt && deploymentTransaction?.gasPrice) {
      const deploymentCost = ethers.formatEther(
        receipt.gasUsed * deploymentTransaction.gasPrice
      );
      console.log(`💸 Deployment Cost: ${deploymentCost} BNB`);
    }

    // Save deployment information
    await saveDeploymentInfo(result, treasuryAddress, dexRouterAddress);

    // Run post-deployment verification
    console.log("\n🧪 Running Post-Deployment Verification...");
    await runPostDeploymentVerification(contract, treasuryAddress, dexRouterAddress);

    // Update frontend environment file
    await updateFrontendEnv(result.contractAddress);

    console.log("\n🎉 Deployment Completed Successfully!");
    console.log("=" * 60);
    console.log("📋 Next Steps:");
    console.log("1. Update frontend configuration");
    console.log("2. Test contract functionality");
    console.log("3. Verify contract on BSCScan");
    console.log("4. Start building frontend integration");

    return result;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);

    // Provide helpful error information
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Add more BNB to your testnet account");
    } else if (error.message.includes("gas")) {
      console.log("💡 Solution: Try increasing gas limit or gas price");
    } else if (error.message.includes("nonce")) {
      console.log("💡 Solution: Wait for previous transaction to confirm or reset nonce");
    }

    process.exit(1);
  }
}

/**
 * Save deployment information
 */
async function saveDeploymentInfo(result: DeploymentResult, treasuryAddress: string, dexRouterAddress: string) {
  const deploymentInfo = {
    network: "bscTestnet",
    contractName: "RabbitLaunchpad",
    address: result.contractAddress,
    transactionHash: result.transactionHash,
    gasUsed: result.gasUsed,
    blockNumber: result.blockNumber,
    deployer: result.deployer,
    deployedAt: result.deploymentTime,
    version: "1.0.0",
    environment: "testnet",
    verified: false,
    treasuryAddress,
    dexRouterAddress
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `testnet.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`📁 Deployment saved to: ${deploymentFile}`);
  return deploymentInfo;
}

/**
 * Update frontend environment file
 */
async function updateFrontendEnv(contractAddress: string) {
  const envContent = `# BSC Testnet Configuration
VITE_LAUNCHPAD_CONTRACT_ADDRESS=${contractAddress}
VITE_BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
VITE_BSC_CHAIN_ID=97
VITE_BSC_EXPLORER=https://testnet.bscscan.com
VITE_NETWORK_NAME=bsc-testnet
VITE_APP_NAME=Rabbit Launchpad
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Create and trade tokens on bonding curves
`;

  const envFile = path.join(__dirname, "../../frontend/.env.testnet");
  fs.writeFileSync(envFile, envContent);

  console.log(`📁 Frontend environment updated: ${envFile}`);
}

/**
 * Run post-deployment verification tests
 */
async function runPostDeploymentVerification(contract: any, treasuryAddress: string, dexRouterAddress: string) {
  try {
    console.log("🔍 Checking initial contract state...");

    // Check basic state
    const treasury = await contract.treasury();
    const dexRouter = await contract.globalState().then(state => state.dexRouter);

    console.log("   Contract State Check:");
    console.log(`   ✅ Treasury: ${treasury}`);
    console.log(`   ✅ DEX Router: ${dexRouter}`);

    // Verify treasury is set correctly
    if (treasury.toLowerCase() !== treasuryAddress.toLowerCase()) {
      throw new Error("Treasury address mismatch");
    }

    // Verify DEX router is set correctly
    if (dexRouter.toLowerCase() !== dexRouterAddress.toLowerCase()) {
      throw new Error("DEX router address mismatch");
    }

    // Test basic functions
    console.log("   ✅ Testing basic functions...");

    const totalTokensCreated = await contract.globalState().then(state => state.totalTokensCreated);
    console.log(`   ✅ Total tokens created: ${totalTokensCreated.toString()}`);

    // Test price calculation
    const initialPrice = await contract.calculatePrice(0);
    console.log(`   ✅ Initial price: ${ethers.formatEther(initialPrice)} BNB`);

    console.log("✅ All post-deployment verification checks passed");

  } catch (error) {
    console.error("❌ Post-deployment verification failed:", error);
    throw error;
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run deployment
main()
  .then((result) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log(`📍 Contract Address: ${result.contractAddress}`);
    console.log(`🔗 BSCScan: https://testnet.bscscan.com/address/${result.contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deployment failed:', error);
    process.exit(1);
  });