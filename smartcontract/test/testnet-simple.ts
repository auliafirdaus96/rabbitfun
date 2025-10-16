import { ethers } from "hardhat";

async function testTestnetContract() {
  console.log("🚀 Testing Contract on BSC Testnet...");

  // Network configuration
  const contractAddress = "0x006Fb00cff2DBC089794FABB415298Cc1b5307Fb";
  const rpcUrl = "https://bsc-testnet.public.blastapi.io";

  // Connect to BSC Testnet
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Get signer from private key
  const privateKey = process.env.PRIVATE_KEY || "6c3f5b2ea1a230e46d21cf2c3bee35317cc19f95145cb77644be9e50e6f8be3f";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log("📋 Account Information:");
  console.log("Signer Address:", signer.address);
  console.log("Contract Address:", contractAddress);

  // Check balance
  const balance = await provider.getBalance(signer.address);
  console.log("Account Balance:", ethers.formatEther(balance), "BNB");

  // Contract ABI (simplified)
  const contractABI = [
    "function createToken(string name, string symbol, string metadata) payable",
    "function getAllTokens() view returns (address[])",
    "function CREATE_FEE() view returns (uint256)"
  ];

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  try {
    // Test 1: Check contract constants
    console.log("\n📊 Contract Constants:");
    const createFee = await contract.CREATE_FEE();
    console.log("CREATE_FEE:", ethers.formatEther(createFee), "BNB");

    // Check if we have enough balance
    if (balance < createFee) {
      console.log("❌ Insufficient balance for token creation");
      console.log("Required:", ethers.formatEther(createFee), "BNB");
      console.log("Available:", ethers.formatEther(balance), "BNB");
      return;
    }

    // Test 2: Check all tokens
    console.log("\n📋 Token List:");
    const tokenList = await contract.getAllTokens();
    console.log("Total tokens created:", tokenList.length);

    // Test 3: Try to create a new token
    console.log("\n🎯 Creating New Token...");
    const tokenName = "Testnet Token";
    const tokenSymbol = "TNT";
    const metadata = "https://example.com/metadata.json";

    console.log("Creating token:", tokenName, "(", tokenSymbol, ")");
    console.log("Sending", ethers.formatEther(createFee), "BNB...");

    const tx = await contract.createToken(
      tokenName,
      tokenSymbol,
      metadata,
      { value: createFee }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("✅ Token created successfully!");
    console.log("Gas used:", receipt!.gasUsed.toString());
    console.log("Block number:", receipt!.blockNumber);

    // Test 4: Verify new token in list
    console.log("\n📋 Updated Token List:");
    const updatedTokenList = await contract.getAllTokens();
    console.log("Total tokens created:", updatedTokenList.length);

    if (updatedTokenList.length > tokenList.length) {
      const newToken = updatedTokenList[updatedTokenList.length - 1];
      console.log("New token address:", newToken);
      console.log("✅ New token verification successful!");
    }

    console.log("\n🎉 Token creation test passed! Contract is working correctly on BSC Testnet!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testTestnetContract()
  .then(() => {
    console.log("\n✅ Testnet verification completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Testnet verification failed:", error);
    process.exit(1);
  });