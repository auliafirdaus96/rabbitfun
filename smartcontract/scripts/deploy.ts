import { ethers } from "hardhat";

async function main() {
  console.log("Deploying RabbitLaunchpad contract...");

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to ${network.name} (Chain ID: ${network.chainId})`);

  // Treasury address - replace with your actual treasury address
  const treasuryAddress = process.env.TREASURY_ADDRESS || "0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45";

  // PancakeSwap Router address based on network
  let pancakeswapRouter: string;
  if (network.chainId === 97n) { // BSC Testnet
    pancakeswapRouter = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  } else if (network.chainId === 56n) { // BSC Mainnet
    pancakeswapRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  } else {
    throw new Error("Unsupported network. Please use BSC Testnet or Mainnet.");
  }

  console.log(`Treasury Address: ${treasuryAddress}`);
  console.log(`PancakeSwap Router: ${pancakeswapRouter}`);

  // Deploy contract
  const RabbitLaunchpad = await ethers.getContractFactory("contracts/RabbitLaunchpad.sol");
  const rabbitLaunchpad = await RabbitLaunchpad.deploy(
    treasuryAddress,
    pancakeswapRouter
  );

  await rabbitLaunchpad.waitForDeployment();
  const contractAddress = await rabbitLaunchpad.getAddress();

  console.log(`RabbitLaunchpad deployed to: ${contractAddress}`);
  console.log(`Transaction hash: ${rabbitLaunchpad.deploymentTransaction()?.hash}`);

  // Verify contract on block explorer
  console.log("\nTo verify the contract, run:");
  console.log(`npx hardhat verify --network ${network.name} ${contractAddress} ${treasuryAddress} ${pancakeswapRouter}`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress: contractAddress,
    treasuryAddress: treasuryAddress,
    pancakeswapRouter: pancakeswapRouter,
    deploymentTransaction: rabbitLaunchpad.deploymentTransaction()?.hash,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployments/${network.name}.json`);

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });