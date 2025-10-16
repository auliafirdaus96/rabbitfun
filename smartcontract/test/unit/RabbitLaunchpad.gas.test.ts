import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { AhiruToken } from "../../client/src/types/contracts";

describe("RabbitLaunchpad - Gas Optimization", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: AhiruToken;

  const CREATE_FEE = ethers.parseEther("0.005");

  beforeEach(async function () {
    [owner, creator, buyer, treasury, dexRouter] = await ethers.getSigners();

    const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
    launchpad = await Launchpad.deploy(
      await treasury.getAddress(),
      await dexRouter.getAddress()
    );
    await launchpad.waitForDeployment();

    // Create a token for testing
    await launchpad.connect(creator).createToken(
      "Test Token",
      "TEST",
      "https://example.com/metadata.json",
      { value: CREATE_FEE }
    );

    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);
    token = await ethers.getContractAt("AhiruToken", tokenAddress);
  });

  describe("Deployment Gas Usage", function () {
    it("Should deploy within reasonable gas limits", async function () {
      const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
      const tx = await Launchpad.deploy(
        await treasury.getAddress(),
        await dexRouter.getAddress()
      );
      const receipt = await tx.deploymentTransaction()?.wait();

      expect(receipt!.gasUsed).to.be.lt(5000000n); // Should be under 5M gas
    });

    it("Should track deployment gas cost", async function () {
      const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
      const deployTx = await Launchpad.getDeployTransaction(
        await treasury.getAddress(),
        await dexRouter.getAddress()
      );

      const estimatedGas = await ethers.provider.estimateGas(deployTx);
      expect(estimatedGas).to.be.lt(5000000n);
    });
  });

  describe("Token Creation Gas Usage", function () {
    it("Should create token within reasonable gas limits", async function () {
      const tx = await launchpad.connect(creator).createToken(
        "Gas Test Token",
        "GAS",
        "https://example.com/gas.json",
        { value: CREATE_FEE }
      );
      const receipt = await tx.wait();

      expect(receipt!.gasUsed).to.be.lt(3000000n); // Should be under 3M gas
    });

    it("Should measure gas for different metadata lengths", async function () {
      const metadataLengths = [
        "https://example.com/short.json",
        "https://example.com/" + "a".repeat(100) + ".json",
        "https://example.com/" + "a".repeat(500) + ".json",
        "https://example.com/" + "a".repeat(1000) + ".json"
      ];

      const gasUsages: bigint[] = [];

      for (const metadata of metadataLengths) {
        const tx = await launchpad.connect(creator).createToken(
          "Metadata Test",
          "META",
          metadata,
          { value: CREATE_FEE }
        );
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should increase with metadata length but remain reasonable
      expect(gasUsages[gasUsages.length - 1]).to.be.lt(4000000n);
    });

    it("Should measure gas for different name lengths", async function () {
      const nameLengths = [
        "A",
        "Short",
        "Medium Length Name",
        "A".repeat(50),
        "A".repeat(100),
        "A".repeat(500)
      ];

      const gasUsages: bigint[] = [];

      for (const name of nameLengths) {
        const tx = await launchpad.connect(creator).createToken(
          name,
          "TEST",
          "https://example.com/test.json",
          { value: CREATE_FEE }
        );
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Even very long names should be within reasonable gas limits
      expect(gasUsages[gasUsages.length - 1]).to.be.lt(4000000n);
    });
  });

  describe("Buy Operation Gas Usage", function () {
    it("Should buy tokens within reasonable gas limits", async function () {
      const buyAmount = ethers.parseEther("1");

      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();

      expect(receipt!.gasUsed).to.be.lt(500000n); // Should be under 500k gas
    });

    it("Should measure gas for different buy amounts", async function () {
      const buyAmounts = [
        ethers.parseEther("0.001"),
        ethers.parseEther("0.01"),
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];

      const gasUsages: bigint[] = [];

      for (const amount of buyAmounts) {
        // Create new token for each test to avoid price curve effects
        await launchpad.connect(creator).createToken(
          `Gas Test ${gasUsages.length}`,
          `GT${gasUsages.length}`,
          "https://example.com/gas.json",
          { value: CREATE_FEE }
        );
      const token2Address = await launchpad.getAllTokens().then(tokens => tokens[1]);
        const tokenAddress = token2Address; // Add reference for backward compatibility

        const tx = await launchpad.connect(buyer).buy(tokenAddress, { value: amount });
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should be relatively consistent across amounts
      const maxGas = gasUsages.reduce((max, current) => current > max ? current : max, 0n);
      const minGas = gasUsages.reduce((min, current) => current < min ? current : min, ethers.MaxUint256);

      expect(maxGas - minGas).to.be.lt(100000n); // Variation should be under 100k gas
      expect(maxGas).to.be.lt(600000n); // Max should be under 600k gas
    });

    it("Should measure gas for consecutive buys", async function () {
      const buyAmount = ethers.parseEther("1");
      const gasUsages: bigint[] = [];

      for (let i = 0; i < 10; i++) {
        const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should increase slightly with each buy due to bonding curve complexity
      expect(gasUsages[gasUsages.length - 1]).to.be.lt(800000n); // Should remain under 800k gas

      // But shouldn't increase dramatically
      const increase = gasUsages[gasUsages.length - 1] - gasUsages[0];
      expect(increase).to.be.lt(200000n); // Increase should be under 200k gas
    });

    it("Should optimize gas for bonding curve calculations", async function () {
      const buyAmount = ethers.parseEther("1");

      // First buy to establish baseline
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      // Test gas for bonding curve calculation specifically
      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      const calculationGas = await launchpad.calculateTokenPurchase.estimateGas(
        tokenInfo.soldSupply,
        buyAmount,
        tokenInfo.initialPrice,
        0
      );

      expect(calculationGas).to.be.lt(100000n); // Calculation should be under 100k gas
    });
  });

  describe("Sell Operation Gas Usage", function () {
    beforeEach(async function () {
      // Buy tokens first for sell tests
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });
    });

    it("Should sell tokens within reasonable gas limits", async function () {
      const sellAmount = await token.balanceOf(await buyer.getAddress());

      const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();

      expect(receipt!.gasUsed).to.be.lt(500000n); // Should be under 500k gas
    });

    it("Should measure gas for different sell amounts", async function () {
      const totalTokens = await token.balanceOf(await buyer.getAddress());
      const sellFractions = [0.1, 0.25, 0.5, 0.75, 1.0];

      const gasUsages: bigint[] = [];

      for (const fraction of sellFractions) {
        // Buy fresh tokens for each test
        await launchpad.connect(creator).createToken(
          `Sell Test ${gasUsages.length}`,
          `ST${gasUsages.length}`,
          "https://example.com/sell.json",
          { value: CREATE_FEE }
        );
      const token3Address = await launchpad.getAllTokens().then(tokens => tokens[2]);
        const tokenAddress = token3Address; // Add reference for backward compatibility

        await launchpad.connect(buyer).buy(tokenAddress, { value: ethers.parseEther("10") });
        const testToken = await ethers.getContractAt("AhiruToken", tokenAddress);
        const balance = await testToken.balanceOf(await buyer.getAddress());
        const sellAmount = (balance * BigInt(Math.floor(fraction * 100))) / 100n;

        const tx = await launchpad.connect(buyer).sell(tokenAddress, sellAmount);
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should be relatively consistent
      const maxGas = gasUsages.reduce((max, current) => current > max ? current : max, 0n);
      expect(maxGas).to.be.lt(600000n); // Max should be under 600k gas
    });

    it("Should measure gas for consecutive sells", async function () {
      // Buy more tokens for multiple sells
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      const totalTokens = await token.balanceOf(await buyer.getAddress());
      const sellAmount = totalTokens / 5n; // Sell 1/5 each time
      const gasUsages: bigint[] = [];

      for (let i = 0; i < 5; i++) {
        const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should remain consistent
      const maxGas = gasUsages.reduce((max, current) => current > max ? current : max, 0n);
      const minGas = gasUsages.reduce((min, current) => current < min ? current : min, ethers.MaxUint256);

      expect(maxGas - minGas).to.be.lt(100000n); // Variation should be under 100k gas
      expect(maxGas).to.be.lt(600000n); // Max should be under 600k gas
    });
  });

  describe("Graduation Gas Usage", function () {
    it("Should graduate within reasonable gas limits", async function () {
      // Buy enough to graduate
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      const tx = await launchpad.connect(creator).graduate(await token.getAddress());
      const receipt = await tx.wait();

      expect(receipt!.gasUsed).to.be.lt(400000n); // Should be under 400k gas
    });

    it("Should measure gas for graduation at different thresholds", async function () {
      const thresholds = [
        ethers.parseEther("1"),    // Minimum
        ethers.parseEther("5"),    // 5x minimum
        ethers.parseEther("10"),   // 10x minimum
        ethers.parseEther("100")   // 100x minimum
      ];

      const gasUsages: bigint[] = [];

      for (const threshold of thresholds) {
        // Create new token for each test
        await launchpad.connect(creator).createToken(
          `Grad Test ${gasUsages.length}`,
          `GT${gasUsages.length}`,
          "https://example.com/grad.json",
          { value: CREATE_FEE }
        );
      const token4Address = await launchpad.getAllTokens().then(tokens => tokens[3]);
        const tokenAddress = token4Address; // Add reference for backward compatibility

        await launchpad.connect(buyer).buy(tokenAddress, { value: threshold });

        const tx = await launchpad.connect(creator).graduate(tokenAddress);
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should not increase dramatically with higher amounts
      const maxGas = gasUsages.reduce((max, current) => current > max ? current : max, 0n);
      expect(maxGas).to.be.lt(500000n); // Max should be under 500k gas
    });
  });

  describe("View Function Gas Usage", function () {
    it("Should measure gas for getTokenInfo", async function () {
      const gasUsed = await launchpad.getTokenInfo.estimateGas(await token.getAddress());
      expect(gasUsed).to.be.lt(50000n); // Should be under 50k gas
    });

    it("Should measure gas for getAllTokens", async function () {
      // Create multiple tokens
      for (let i = 0; i < 5; i++) {
        await launchpad.connect(creator).createToken(
          `View Test ${i}`,
          `VT${i}`,
          "https://example.com/view.json",
          { value: CREATE_FEE }
        );
      }

      const gasUsed = await launchpad.getAllTokens.estimateGas();
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });

    it("Should measure gas for calculateTokenPurchase", async function () {
      const gasUsed = await launchpad.calculateTokenPurchase.estimateGas(
        1000000,
        ethers.parseEther("1"),
        ethers.parseEther("0.0000005"),
        5 * 10**19
      );
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });

    it("Should measure gas for calculateTokenSale", async function () {
      const gasUsed = await launchpad.calculateTokenSale.estimateGas(
        1000000,
        1000000,
        ethers.parseEther("0.0000005"),
        5 * 10**19
      );
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });
  });

  describe("Owner Function Gas Usage", function () {
    it("Should measure gas for updateTreasury", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;
      const gasUsed = await launchpad.connect(owner).updateTreasury.estimateGas(newTreasury);
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });

    it("Should measure gas for updateDexRouter", async function () {
      const newRouter = ethers.Wallet.createRandom().address;
      const gasUsed = await launchpad.connect(owner).updateDexRouter.estimateGas(newRouter);
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });

    it("Should measure gas for emergencyWithdraw", async function () {
      // Add some BNB to contract first
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      const gasUsed = await launchpad.connect(owner)["emergencyWithdraw(uint256)"].estimateGas(ethers.parseEther("1"));
      expect(gasUsed).to.be.lt(100000n); // Should be under 100k gas
    });
  });

  describe("Gas Optimization Opportunities", function () {
    it("Should identify potential optimizations in buy function", async function () {
      const buyAmount = ethers.parseEther("1");

      // Test gas usage with and without various optimizations
      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();

      // This gives us a baseline to compare against potential optimizations
      expect(receipt!.gasUsed).to.be.lt(500000n);
    });

    it("Should identify potential optimizations in sell function", async function () {
      // Buy tokens first
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();

      // This gives us a baseline to compare against potential optimizations
      expect(receipt!.gasUsed).to.be.lt(500000n);
    });

    it("Should measure gas efficiency of storage operations", async function () {
      // Create multiple tokens to test storage efficiency
      const gasUsages: bigint[] = [];

      for (let i = 0; i < 10; i++) {
        const tx = await launchpad.connect(creator).createToken(
          `Storage Test ${i}`,
          `ST${i}`,
          "https://example.com/storage.json",
          { value: CREATE_FEE }
        );
        const receipt = await tx.wait();
        gasUsages.push(receipt!.gasUsed);
      }

      // Gas usage should not increase dramatically with more tokens
      const firstGas = gasUsages[0];
      const lastGas = gasUsages[gasUsages.length - 1];

      expect(lastGas - firstGas).to.be.lt(100000n); // Increase should be under 100k gas
    });
  });

  describe("Batch Operation Gas Analysis", function () {
    it("Should analyze gas for multiple operations in sequence", async function () {
      const operations = [];

      // Create token
      operations.push(
        launchpad.connect(creator).createToken(
          "Batch Test",
          "BATCH",
          "https://example.com/batch.json",
          { value: CREATE_FEE }
        )
      );

      // Wait for creation and get token address
      await operations[0];
      const token5Address = await launchpad.getAllTokens().then(tokens => tokens[4]);
        const tokenAddress = token5Address; // Add reference for backward compatibility

      // Multiple buys
      for (let i = 0; i < 5; i++) {
        operations.push(
          launchpad.connect(buyer).buy(tokenAddress, { value: ethers.parseEther("1") })
        );
      }

      // Execute all operations
      const results = await Promise.all(operations);

      // Calculate total gas used
      let totalGas = 0n;
      for (const result of results) {
        const receipt = await result.wait();
        totalGas += receipt!.gasUsed;
      }

      // Total gas should be reasonable for 6 operations
      expect(totalGas).to.be.lt(5000000n); // Under 5M gas for all operations
    });
  });
});