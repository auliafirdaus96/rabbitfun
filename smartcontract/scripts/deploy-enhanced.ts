import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import fs from "fs";
import path from "path";

interface DeploymentConfig {
  network: string;
  treasury: string;
  verify: boolean;
  gasLimit?: number;
  gasPrice?: string;
}

interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  gasUsed: string;
  blockNumber: number;
  deployer: string;
}

/**
 * Enhanced deployment script for RabbitLaunchpad with security features
 */
async function main() {
  console.log("🚀 Starting Enhanced RabbitLaunchpad Deployment");
  console.log("=" * 50);

  // Get network configuration
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = network.chainId;

  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);

  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.getBalance();

  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);

  // Deployment configuration
  const config: DeploymentConfig = {
    network: networkName,
    treasury: process.env.TREASURY_ADDRESS || deployerAddress,
    verify: process.env.VERIFY_CONTRACTS === "true",
    gasLimit: parseInt(process.env.GAS_LIMIT || "8000000"),
    gasPrice: process.env.GAS_PRICE
  };

  console.log("⚙️ Deployment Configuration:");
  console.log(`   Treasury: ${config.treasury}`);
  console.log(`   Verify: ${config.verify}`);
  console.log(`   Gas Limit: ${config.gasLimit}`);

  // Validate treasury address
  if (!ethers.utils.isAddress(config.treasury)) {
    throw new Error("Invalid treasury address");
  }

  try {
    // Deploy enhanced contract
    console.log("\n🔨 Deploying Enhanced RabbitLaunchpad...");

    const contractFactory: ContractFactory = await ethers.getContractFactory("RabbitLaunchpad_Enhanced_Final");

    const deployTx = await contractFactory.deploy(config.treasury, {
      gasLimit: config.gasLimit,
      gasPrice: config.gasPrice ? ethers.utils.parseUnits(config.gasPrice, "gwei") : undefined
    });

    console.log("⏳ Waiting for deployment confirmation...");
    const receipt = await deployTx.deployTransaction.wait();

    const result: DeploymentResult = {
      contractAddress: deployTx.address,
      transactionHash: deployTx.deployTransaction.hash,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber,
      deployer: deployerAddress
    };

    console.log("✅ Enhanced RabbitLaunchpad deployed successfully!");
    console.log(`   Address: ${result.contractAddress}`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Gas Used: ${result.gasUsed}`);
    console.log(`   Block: ${result.blockNumber}`);

    // Save deployment information
    await saveDeploymentInfo(networkName, result);

    // Verify contract if requested
    if (config.verify) {
      console.log("\n🔍 Verifying contract on Etherscan...");
      await verifyContract(result.contractAddress, [config.treasury]);
    }

    // Run post-deployment checks
    console.log("\n🧪 Running post-deployment checks...");
    await runPostDeploymentChecks(deployTx, config);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Next Steps:");
    console.log("1. Update frontend with new contract address");
    console.log("2. Test all functions on testnet");
    console.log("3. Run comprehensive security tests");
    console.log("4. Monitor contract for first 24 hours");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

/**
 * Save deployment information to file
 */
async function saveDeploymentInfo(network: string, result: DeploymentResult) {
  const deploymentInfo = {
    network,
    contractName: "RabbitLaunchpad_Enhanced_Final",
    address: result.contractAddress,
    transactionHash: result.transactionHash,
    gasUsed: result.gasUsed,
    blockNumber: result.blockNumber,
    deployer: result.deployer,
    deployedAt: new Date().toISOString(),
    version: "1.1.0-enhanced"
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network}-enhanced.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  // Also save to artifacts
  const artifactsDir = path.join(__dirname, "../artifacts/deployments");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const artifactsFile = path.join(artifactsDir, `${network}-enhanced.json`);
  fs.writeFileSync(artifactsFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`📁 Deployment info saved to: ${deploymentFile}`);
}

/**
 * Verify contract on Etherscan
 */
async function verifyContract(contractAddress: string, constructorArgs: any[]) {
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Contract verified successfully");
  } catch (error) {
    console.log("⚠️ Contract verification failed:", error.message);
  }
}

/**
 * Run post-deployment security checks
 */
async function runPostDeploymentChecks(
  contract: any,
  config: DeploymentConfig
) {
  try {
    // Check initial state
    const treasury = await contract.treasury();
    const paused = await contract.paused();
    const emergencyMode = await contract.isEmergencyMode();
    const balance = await contract.contractBalance();

    console.log("🔍 Contract State Check:");
    console.log(`   Treasury: ${treasury}`);
    console.log(`   Paused: ${paused}`);
    console.log(`   Emergency Mode: ${emergencyMode}`);
    console.log(`   Balance: ${ethers.utils.formatEther(balance)} BNB`);

    // Verify treasury is set correctly
    if (treasury.toLowerCase() !== config.treasury.toLowerCase()) {
      throw new Error("Treasury address mismatch");
    }

    // Verify initial state
    if (paused || emergencyMode) {
      console.log("⚠️ Warning: Contract is in paused or emergency mode");
    }

    // Test emergency functions (only on testnet)
    const network = await ethers.provider.getNetwork();
    if (network.name !== "mainnet") {
      console.log("🧪 Testing emergency functions on testnet...");

      // Test pause
      await contract.pause();
      let isPaused = await contract.paused();
      if (!isPaused) {
        throw new Error("Pause function not working");
      }
      console.log("✅ Pause function working");

      // Test unpause
      await contract.unpause();
      isPaused = await contract.paused();
      if (isPaused) {
        throw new Error("Unpause function not working");
      }
      console.log("✅ Unpause function working");

      console.log("✅ Emergency functions verified");
    }

    console.log("✅ All post-deployment checks passed");

  } catch (error) {
    console.error("❌ Post-deployment check failed:", error);
    throw error;
  }
}

/**
 * Create migration report
 */
function createMigrationReport(
  oldAddress: string | null,
  newAddress: string,
  network: string
) {
  const report = {
    migration: {
      from: oldAddress || "new deployment",
      to: newAddress,
      network,
      timestamp: new Date().toISOString(),
      version: {
        from: "1.0.0",
        to: "1.1.0-enhanced"
      }
    },
    securityImprovements: [
      "Enhanced mathematical operations with SafeBondingCurveMath",
      "Safe external calls with proper error handling",
      "Emergency pause/unpause functionality",
      "Gas optimizations and bounded loops",
      "Comprehensive input validation",
      "Enhanced event logging and monitoring"
    ],
    newFeatures: [
      "Emergency mode activation/deactivation",
      "Delayed admin updates (treasury, DEX router)",
      "Emergency token recovery",
      "Enhanced gas usage tracking",
      "Security event logging"
    ],
    breakingChanges: [
      "No breaking changes - fully backward compatible",
      "Same function signatures",
      "Enhanced return values and events"
    ],
    recommendedActions: [
      "Update frontend to use enhanced events",
      "Test all user flows",
      "Monitor gas usage improvements",
      "Set up alerts for security events"
    ]
  };

  const reportFile = path.join(__dirname, "../reports/migration-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`📋 Migration report created: ${reportFile}`);
  return report;
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });