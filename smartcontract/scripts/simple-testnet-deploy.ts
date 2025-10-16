import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Simple Testnet Deployment");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.getBalance();

  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);

  // Check minimum balance
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    throw new Error("Insufficient balance for deployment");
  }

  const treasury = process.env.TREASURY_ADDRESS || deployerAddress;
  console.log(`🏛️ Treasury: ${treasury}`);

  // Get contract factory
  const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad_Security_Enhanced");

  console.log("🔨 Deploying contract...");

  // Deploy contract
  const contract = await RabbitLaunchpad.deploy(treasury, {
    gasLimit: 8000000,
    gasPrice: ethers.utils.parseUnits("20", "gwei")
  });

  await contract.deployed();

  console.log("✅ Contract deployed successfully!");
  console.log(`📍 Address: ${contract.address}`);
  console.log(`🔗 Transaction: ${contract.deployTransaction.hash}`);

  // Save deployment info
  const deploymentInfo = {
    network: "bscTestnet",
    address: contract.address,
    transactionHash: contract.deployTransaction.hash,
    deployer: deployerAddress,
    treasury: treasury,
    deployedAt: new Date().toISOString(),
    version: "1.1.0-enhanced"
  };

  // Save to file
  const fs = require('fs');
  const path = require('path');

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const testnetDir = path.join(deploymentsDir, 'testnet');
  if (!fs.existsSync(testnetDir)) {
    fs.mkdirSync(testnetDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(testnetDir, 'enhanced.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📁 Deployment saved to deployments/testnet/enhanced.json");

  // Run basic verification
  console.log("🧪 Running basic verification...");

  const paused = await contract.paused();
  const emergencyMode = await contract.isEmergencyMode();
  const contractTreasury = await contract.treasury();

  console.log(`✅ Paused: ${paused}`);
  console.log(`✅ Emergency Mode: ${emergencyMode}`);
  console.log(`✅ Treasury: ${contractTreasury}`);

  // Test pause/unpause
  await contract.pause();
  let isPaused = await contract.paused();
  console.log(`✅ Pause test: ${isPaused}`);

  await contract.unpause();
  isPaused = await contract.paused();
  console.log(`✅ Unpause test: ${!isPaused}`);

  console.log("\n🎉 Deployment and verification completed!");
  console.log("🔗 BSCScan: https://testnet.bscscan.com/address/" + contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });