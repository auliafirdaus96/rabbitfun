const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Simple Testnet Deployment");
  console.log("==========================");

  try {
    // Get signers
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`👤 Deployer: ${deployerAddress}`);

    // Check balance
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);

    const minBalance = ethers.utils.parseEther("0.1");
    if (balance.lt(minBalance)) {
      throw new Error("Insufficient balance for deployment");
    }

    // Get treasury address
    const treasury = process.env.TREASURY_ADDRESS || deployerAddress;
    console.log(`🏛️ Treasury: ${treasury}`);

    // Get contract factory
    console.log("🔨 Getting contract factory...");
    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad_Security_Enhanced");

    // Deploy contract
    console.log("🚀 Deploying contract...");
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

    // Create directories
    const deploymentsDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const testnetDir = path.join(deploymentsDir, 'testnet');
    if (!fs.existsSync(testnetDir)) {
      fs.mkdirSync(testnetDir, { recursive: true });
    }

    // Save deployment info
    fs.writeFileSync(
      path.join(testnetDir, 'enhanced.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("📁 Deployment saved!");

    console.log("\n🎉 Deployment completed!");
    console.log(`🔗 BSCScan: https://testnet.bscscan.com/address/${contract.address}`);

    return contract.address;

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then((address) => {
    console.log(`✅ Success! Contract: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  });