import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../client/src/types/contracts";

async function debugEvent() {
  console.log("Starting debug...");

  const [owner, creator, treasury, dexRouter] = await ethers.getSigners();

  const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
  const launchpad = await Launchpad.deploy(
    await treasury.getAddress(),
    await dexRouter.getAddress()
  );
  await launchpad.waitForDeployment();

  console.log("Launchpad deployed at:", await launchpad.getAddress());

  const CREATE_FEE = ethers.parseEther("0.005");

  console.log("Creating token...");
  const tx = await launchpad.connect(creator).createToken(
    "Debug Token",
    "DEBUG",
    "https://example.com/debug.json",
    { value: CREATE_FEE }
  );

  console.log("Transaction hash:", tx.hash);
  const receipt = await tx.wait();

  console.log("Gas used:", receipt!.gasUsed.toString());
  console.log("Status:", receipt!.status);
  console.log("Number of logs:", receipt!.logs.length);

  receipt!.logs.forEach((log, index) => {
    console.log(`\nLog ${index}:`, {
      address: log.address,
      topics: log.topics,
      data: log.data,
      removed: log.removed
    });

    try {
      const parsed = launchpad.interface.parseLog(log);
      if (parsed) {
        console.log(`Parsed log ${index}:`, {
          name: parsed.name,
          args: parsed.args.map(arg => arg.toString())
        });
      }
    } catch (e) {
      console.log(`Failed to parse log ${index}:`, e);
    }
  });

  // Try to get global state
  try {
    const globalState = await launchpad.globalState();
    console.log("\nGlobal state:", {
      totalTokensCreated: globalState.totalTokensCreated.toString(),
      totalFeesCollected: globalState.totalFeesCollected.toString(),
      dexRouter: globalState.dexRouter
    });
  } catch (e) {
    console.log("Failed to get global state:", e);
  }

  // Try to get token info directly
  try {
    const tokenList = await launchpad.getAllTokens();
    console.log("\nAll tokens:", tokenList);
    if (tokenList.length > 0) {
      const tokenInfo = await launchpad.getTokenInfo(tokenList[0]);
      console.log("First token info:", tokenInfo);
    }
  } catch (e) {
    console.log("Failed to get token info:", e);
  }
}

debugEvent()
  .then(() => {
    console.log("Debug completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Debug failed:", error);
    process.exit(1);
  });