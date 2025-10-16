import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Windows-Compatible Testnet Deployment");
  console.log("=============================================");

  try {
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

    if (network.chainId !== 97n) {
      console.log("⚠️  Warning: You are not on BSC Testnet (Chain ID: 97)");
      console.log(`Current Chain ID: ${network.chainId}`);
    }

    // Get signers
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      throw new Error("No signers available. Check your private key configuration.");
    }

    const deployer = signers[0];
    const deployerAddress = await deployer.getAddress();
    console.log(`👤 Deployer: ${deployerAddress}`);

    // Check balance safely
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} BNB`);

    // Check minimum balance
    const minBalance = ethers.utils.parseEther("0.1");
    if (balance.lt(minBalance)) {
      throw new Error(`Insufficient balance. Need at least ${ethers.utils.formatEther(minBalance)} BNB for deployment`);
    }

    // Get treasury address
    const treasury = process.env.TREASURY_ADDRESS || deployerAddress;
    console.log(`🏛️ Treasury: ${treasury}`);

    if (!ethers.utils.isAddress(treasury)) {
      throw new Error("Invalid treasury address");
    }

    // Get contract factory
    console.log("🔨 Getting contract factory...");
    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad_Security_Enhanced");

    // Deployment configuration
    const gasPrice = ethers.utils.parseUnits("20", "gwei");
    const gasLimit = 8000000;

    console.log("⚙️ Deployment Configuration:");
    console.log(`   Gas Limit: ${gasLimit}`);
    console.log(`   Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

    // Estimate gas first
    console.log("📊 Estimating deployment gas...");
    try {
      const deployData = RabbitLaunchpad.interface.encodeDeploy([treasury]);
      const estimatedGas = await ethers.provider.estimateGas({
        data: deployData
      });
      console.log(`   Estimated Gas: ${estimatedGas.toString()}`);
    } catch (error) {
      console.log("   ⚠️  Gas estimation failed, proceeding with deployment");
    }

    // Deploy contract
    console.log("🚀 Deploying contract...");
    console.log("   This may take 30-60 seconds...");

    const contract = await RabbitLaunchpad.deploy(treasury, {
      gasLimit: gasLimit,
      gasPrice: gasPrice
    });

    console.log("⏳ Transaction submitted. Waiting for confirmation...");
    console.log(`   Transaction: ${contract.deployTransaction.hash}`);

    const receipt = await contract.deployTransaction.wait();

    console.log("\n✅ Contract deployed successfully!");
    console.log("============================================");
    console.log(`📍 Contract Address: ${contract.address}`);
    console.log(`🔗 Transaction: ${contract.deployTransaction.hash}`);
    console.log(`📦 Block: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);

    // Calculate deployment cost
    const deploymentCost = ethers.utils.formatUnits(
      receipt.gasUsed.mul(receipt.effectiveGasPrice || gasPrice),
      "ether"
    );
    console.log(`💸 Deployment Cost: ${deploymentCost} BNB`);

    // Save deployment information
    const fs = require('fs');
    const path = require('path');

    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      address: contract.address,
      transactionHash: contract.deployTransaction.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployer: deployerAddress,
      treasury: treasury,
      deployedAt: new Date().toISOString(),
      version: "1.1.0-enhanced",
      environment: "testnet"
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

    console.log("📁 Deployment saved to deployments/testnet/enhanced.json");

    // Create frontend environment file
    const envContent = `
# Testnet Environment Variables
NEXT_PUBLIC_ENHANCED_CONTRACT_ADDRESS=${contract.address}
NEXT_PUBLIC_NETWORK_NAME=${network.name}
NEXT_PUBLIC_CHAIN_ID=${network.chainId}
NEXT_PUBLIC_RPC_URL=https://bsc-testnet.public.blastapi.io
NEXT_PUBLIC_EXPLORER_URL=https://testnet.bscscan.com
NEXT_PUBLIC_VERSION=1.1.0-enhanced
`;

    const frontendDir = path.join(__dirname, '../frontend');
    if (fs.existsSync(frontendDir)) {
      fs.writeFileSync(path.join(frontendDir, '.env.testnet'), envContent.trim());
      console.log("📁 Frontend .env.testnet created");
    }

    return contract.address;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);

    // Provide helpful error information
    if (error.message.includes("insufficient funds")) {
      console.log("💡 Solution: Add more BNB to your testnet account");
      console.log("💡 Get testnet BNB from: https://testnet.binance.org/faucet-smart");
    } else if (error.message.includes("gas")) {
      console.log("💡 Solution: Try increasing gas limit or gas price");
    } else if (error.message.includes("signers") || error.message.includes("private key")) {
      console.log("💡 Solution: Check your PRIVATE_KEY in .env file");
      console.log("💡 Ensure private key is valid and has testnet funds");
    } else if (error.message.includes("nonce")) {
      console.log("💡 Solution: Wait for previous transaction to confirm");
    }

    throw error;
  }
}

// Run deployment
main()
  .then((address) => {
    console.log("\n🎉 Testnet deployment completed successfully!");
    console.log(`📍 Contract Address: ${address}`);
    console.log(`🔗 BSCScan: https://testnet.bscscan.com/address/${address}`);
    console.log("\n📋 Next steps:");
    console.log("1. ✅ Verify contract on BSCScan");
    console.log("2. 🧪 Run verification tests");
    console.log("3. 🔍 Test all security features");
    console.log("4. 💰 Test token creation and trading");
    console.log("5. 🚀 Prepare for mainnet deployment");
    console.log("\n" + "=" * 50);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deployment failed:', error.message);
    process.exit(1);
  });