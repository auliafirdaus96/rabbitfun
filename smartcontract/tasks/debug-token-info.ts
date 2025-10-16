import { task } from "hardhat/config";

task("debug-token-info", "Debugs token info structure")
  .setAction(async (_, { ethers }) => {
    console.log("🔍 Debugging token info structure...");

    const [owner, creator, treasury, dexRouter] = await ethers.getSigners();

    const Launchpad = await ethers.getContractFactory("AhiruLaunchpad");
    const launchpad = await Launchpad.deploy(
      await treasury.getAddress(),
      await dexRouter.getAddress()
    );
    await launchpad.waitForDeployment();

    console.log("✅ Launchpad deployed");

    // Create token
    const CREATE_FEE = ethers.parseEther("0.005");
    const tx = await launchpad.connect(creator).createToken(
      "Debug Token",
      "DEBUG",
      "https://example.com/debug.json",
      { value: CREATE_FEE }
    );

    const receipt = await tx.wait();
    console.log("✅ Token created");

    // Get token address
    const tokenList = await launchpad.getAllTokens();
    const tokenAddress = tokenList[0];
    console.log("Token address:", tokenAddress);

    // Get token info
    const tokenInfo = await launchpad.getTokenInfo(tokenAddress);
    console.log("Token info structure:");
    console.log("- name:", tokenInfo.name);
    console.log("- symbol:", tokenInfo.symbol);
    console.log("- creator:", tokenInfo.creator);
    console.log("- soldSupply:", tokenInfo.soldSupply?.toString());
    console.log("- totalBNB:", tokenInfo.totalBNB?.toString());
    console.log("- initialPrice:", tokenInfo.initialPrice?.toString());
    console.log("- slope:", tokenInfo.slope?.toString());
    console.log("- graduated:", tokenInfo.graduated);
    console.log("- exists:", tokenInfo.exists);

    // Check constants
    const initialPrice = await launchpad.INITIAL_PRICE();
    console.log("\nContract constants:");
    console.log("- INITIAL_PRICE:", initialPrice.toString());
    console.log("- CREATE_FEE:", (await launchpad.CREATE_FEE()).toString());
  });