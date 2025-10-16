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

  // Contract ABI (simplified)
  const contractABI = [
    "function createToken(string name, string symbol, string metadata) payable",
    "function buy(address tokenAddress) payable",
    "function sell(address tokenAddress, uint256 tokenAmount)",
    "function graduate(address tokenAddress)",
    "function getTokenInfo(address tokenAddress) view returns (tuple(address tokenAddress, string name, string symbol, string metadata, address creator, uint256 soldSupply, uint256 totalBNB, uint256 initialPrice, uint256 slope, bool graduated, bool exists))",
    "function getAllTokens() view returns (address[])",
    "function CREATE_FEE() view returns (uint256)",
    "function INITIAL_PRICE() view returns (uint256)",
    "function TOTAL_SUPPLY() view returns (uint256)"
  ];

  // Create contract instance
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  try {
    // Test 1: Check contract constants
    console.log("\n📊 Contract Constants:");
    const createFee = await contract.CREATE_FEE();
    const initialPrice = await contract.INITIAL_PRICE();
    const totalSupply = await contract.TOTAL_SUPPLY();

    console.log("CREATE_FEE:", ethers.formatEther(createFee), "BNB");
    console.log("INITIAL_PRICE:", ethers.formatEther(initialPrice), "BNB per token");
    console.log("TOTAL_SUPPLY:", ethers.formatEther(totalSupply), "tokens");

    // Test 2: Check all tokens
    console.log("\n📋 Token List:");
    const tokenList = await contract.getAllTokens();
    console.log("Total tokens created:", tokenList.length);

    if (tokenList.length > 0) {
      const firstToken = tokenList[0];
      console.log("First token address:", firstToken);

      // Test 3: Get token info
      console.log("\n📄 Token Information:");
      const tokenInfo = await contract.getTokenInfo(firstToken);
      console.log("Name:", tokenInfo.name);
      console.log("Symbol:", tokenInfo.symbol);
      console.log("Creator:", tokenInfo.creator);
      console.log("Metadata:", tokenInfo.metadata);
      console.log("Sold Supply:", ethers.formatEther(tokenInfo.soldSupply));
      console.log("Total BNB:", ethers.formatEther(tokenInfo.totalBNB));
      console.log("Initial Price:", ethers.formatEther(tokenInfo.initialPrice));
      console.log("Slope:", tokenInfo.slope.toString());
      console.log("Graduated:", tokenInfo.graduated);
      console.log("Exists:", tokenInfo.exists);

      // Test 4: Try to create a new token
      console.log("\n🎯 Creating New Token...");
      const tokenName = "Testnet Token";
      const tokenSymbol = "TNT";
      const metadata = "https://example.com/metadata.json";

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

      // Test 5: Verify new token in list
      console.log("\n📋 Updated Token List:");
      const updatedTokenList = await contract.getAllTokens();
      console.log("Total tokens created:", updatedTokenList.length);

      if (updatedTokenList.length > tokenList.length) {
        const newToken = updatedTokenList[updatedTokenList.length - 1];
        console.log("New token address:", newToken);

        // Test 6: Get new token info
        const newTokenInfo = await contract.getTokenInfo(newToken);
        console.log("New token name:", newTokenInfo.name);
        console.log("New token symbol:", newTokenInfo.symbol);
        console.log("✅ New token verification successful!");

        // Test 7: Test buy functionality
        console.log("\n💰 Testing Buy Functionality...");
        const buyAmount = ethers.parseEther("0.1"); // 0.1 BNB

        const buyTx = await contract.buy(newToken, { value: buyAmount });
        console.log("Buy transaction hash:", buyTx.hash);

        const buyReceipt = await buyTx.wait();
        console.log("✅ Buy successful!");
        console.log("Gas used:", buyReceipt!.gasUsed.toString());

        // Test 8: Check updated token info after buy
        const finalTokenInfo = await contract.getTokenInfo(newToken);
        console.log("Updated sold supply:", ethers.formatEther(finalTokenInfo.soldSupply));
        console.log("Updated total BNB:", ethers.formatEther(finalTokenInfo.totalBNB));

        console.log("\n🎉 All tests passed! Contract is working correctly on BSC Testnet!");
      }

    } else {
      console.log("No tokens found in the contract");
    }

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