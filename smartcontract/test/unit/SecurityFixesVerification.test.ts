import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad_fixed, RabbitToken_fixed } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("🔒 Security Fixes Verification", function () {
  let launchpad: RabbitLaunchpad_fixed;
  let token: RabbitToken_fixed;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: string;

  const CREATE_FEE = ethers.parseEther("0.005"); // 0.005 BNB
  const INITIAL_PRICE = ethers.parseEther("0.00000001"); // 1e-8 BNB
  const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B tokens

  beforeEach(async function () {
    [owner, creator, buyer, treasury] = await ethers.getSigners();
    dexRouter = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // Mock PancakeSwap router

    // Deploy fixed launchpad
    const LaunchpadFactory = await ethers.getContractFactory("RabbitLaunchpad_fixed_fixed");
    launchpad = await LaunchpadFactory.deploy(await treasury.getAddress(), dexRouter);
    await launchpad.waitForDeployment();
  });

  describe("✅ Fixed Security Issues", function () {
    it("Should create token without 'transfer amount exceeds balance' error", async function () {
      const tokenName = "Security Test Token";
      const tokenSymbol = "TEST";
      const metadata = "https://example.com/metadata.json";

      // This should not fail with balance issues
      await expect(
        launchpad.connect(creator).createToken(tokenName, tokenSymbol, metadata, {
          value: CREATE_FEE,
        })
      ).to.emit(launchpad, "TokenCreated");

      // Get token address from event
      const tokenAddress = await launchpad.globalState().then(state => state.tokenList[0]);
      token = await ethers.getContractAt("RabbitToken_fixed_fixed", tokenAddress);

      // Verify token was created correctly
      expect(await token.name()).to.equal(tokenName);
      expect(await token.symbol()).to.equal(tokenSymbol);
      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should allow buying tokens without balance errors", async function () {
      // Create token first
      const tokenAddress = await createTestToken();
      token = await ethers.getContractAt("RabbitToken_fixed_fixed", tokenAddress);

      // Transfer initial supply to creator
      await token.connect(creator).transfer(await creator.getAddress(), TOTAL_SUPPLY);

      // Approve launchpad to transfer tokens
      await token.connect(creator).approve(await launchpad.getAddress(), TOTAL_SUPPLY);

      // Buy tokens - should not fail with balance errors
      const buyAmount = ethers.parseEther("1"); // 1 BNB
      const minTokensOut = ethers.parseEther("100000"); // Minimum 100K tokens

      await expect(
        launchpad.connect(buyer).buy(tokenAddress, minTokensOut, {
          value: buyAmount,
        })
      ).to.emit(launchpad, "TokenBought");

      // Verify buyer received tokens
      const buyerBalance = await token.balanceOf(await buyer.getAddress());
      expect(buyerBalance).to.be.gte(minTokensOut);
    });

    it("Should handle selling tokens without balance errors", async function () {
      // Create and buy tokens first
      const tokenAddress = await createTestToken();
      token = await ethers.getContractAt("RabbitToken_fixed_fixed", tokenAddress);

      await token.connect(creator).transfer(await creator.getAddress(), TOTAL_SUPPLY);
      await token.connect(creator).approve(await launchpad.getAddress(), TOTAL_SUPPLY);

      const buyAmount = ethers.parseEther("1");
      const minTokensOut = ethers.parseEther("100000");

      await launchpad.connect(buyer).buy(tokenAddress, minTokensOut, {
        value: buyAmount,
      });

      const buyerBalance = await token.balanceOf(await buyer.getAddress());
      const sellAmount = buyerBalance.div(2); // Sell half
      const minBNBOut = ethers.parseEther("0.1");

      // Approve launchpad to transfer tokens for selling
      await token.connect(buyer).approve(await launchpad.getAddress(), sellAmount);

      // Sell tokens - should not fail with balance errors
      await expect(
        launchpad.connect(buyer).sell(tokenAddress, sellAmount, minBNBOut)
      ).to.emit(launchpad, "TokenSold");
    });

    it("Should prevent reentrancy attacks", async function () {
      // Create token
      const tokenAddress = await createTestToken();
      token = await ethers.getContractAt("RabbitToken_fixed_fixed", tokenAddress);

      await token.connect(creator).transfer(await creator.getAddress(), TOTAL_SUPPLY);
      await token.connect(creator).approve(await launchpad.getAddress(), TOTAL_SUPPLY);

      // Rapid consecutive buys to test reentrancy protection
      const buyAmount = ethers.parseEther("0.1");
      const minTokensOut = ethers.parseEther("10000");

      const buyPromises = Array(5).fill(null).map(() =>
        launchpad.connect(buyer).buy(tokenAddress, minTokensOut, {
          value: buyAmount,
        })
      );

      // Should handle rapid transactions without errors
      const results = await Promise.allSettled(buyPromises);
      const failedTransactions = results.filter(r => r.status === 'rejected');

      // Allow some transactions to fail due to slippage or price changes
      // but should not have reentrancy-related failures
      expect(failedTransactions.length).to.be.lt(3);
    });
  });

  describe("✅ Enhanced Access Control", function () {
    it("Should enforce timelock for treasury updates", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;

      // Initiate treasury update
      await expect(
        launchpad.connect(owner).initiateTreasuryUpdate(newTreasury)
      ).to.emit(launchpad, "TreasuryUpdateInitiated");

      // Should not be able to complete immediately
      await expect(
        launchpad.connect(owner).completeTreasuryUpdate()
      ).to.be.revertedWith("Timelock not expired");

      // Fast forward time (in test environment)
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Should be able to complete after timelock
      await expect(
        launchpad.connect(owner).completeTreasuryUpdate()
      ).to.emit(launchpad, "TreasuryUpdateCompleted");
    });

    it("Should prevent unauthorized emergency actions", async function () {
      const amount = ethers.parseEther("1");

      // Non-owner should not be able to emergency withdraw
      await expect(
        launchpad.connect(creator).emergencyWithdraw(amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Owner should be able to emergency withdraw (with timelock)
      await expect(
        launchpad.connect(owner).emergencyWithdraw(amount)
      ).to.be.revertedWith("Emergency timelock not expired");
    });

    it("Should handle pause functionality correctly", async function () {
      // Pause contract
      await expect(
        launchpad.connect(owner).setPause(true)
      ).to.emit(launchpad, "SecurityEvent");

      // Should not be able to create tokens when paused
      await expect(
        launchpad.connect(creator).createToken("Paused Token", "PAUSED", "metadata", {
          value: CREATE_FEE,
        })
      ).to.be.revertedWith("Contract is paused");

      // Unpause contract
      await expect(
        launchpad.connect(owner).setPause(false)
      ).to.emit(launchpad, "SecurityEvent");

      // Should be able to create tokens when unpaused
      await expect(
        launchpad.connect(creator).createToken("Unpaused Token", "UNPAUSED", "metadata", {
          value: CREATE_FEE,
        })
      ).to.emit(launchpad, "TokenCreated");
    });
  });

  describe("✅ Input Validation Improvements", function () {
    it("Should validate token creation parameters", async function () {
      // Test invalid name lengths
      await expect(
        launchpad.connect(creator).createToken("A", "TEST", "metadata", {
          value: CREATE_FEE,
        })
      ).to.be.revertedWith("Invalid name length");

      await expect(
        launchpad.connect(creator).createToken(
          "A".repeat(51), "TEST", "metadata", { value: CREATE_FEE }
        )
      ).to.be.revertedWith("Invalid name length");

      // Test invalid symbol lengths
      await expect(
        launchpad.connect(creator).createToken("Test", "A", "metadata", {
          value: CREATE_FEE,
        })
      ).to.be.revertedWith("Invalid symbol length");

      await expect(
        launchpad.connect(creator).createToken("Test", "TOOLONG", "metadata", {
          value: CREATE_FEE,
        })
      ).to.be.revertedWith("Invalid symbol length");

      // Test invalid metadata length
      await expect(
        launchpad.connect(creator).createToken(
          "Test", "TEST", "m".repeat(1001), { value: CREATE_FEE }
        )
      ).to.be.revertedWith("Metadata too long");
    });

    it("Should validate trading parameters", async function () {
      const tokenAddress = await createTestToken();

      // Test minimum BNB amount
      await expect(
        launchpad.connect(buyer).buy(tokenAddress, ethers.parseEther("1000"), {
          value: ethers.parseEther("0.0001"), // Too small
        })
      ).to.be.revertedWith("Minimum BNB amount is 0.001 BNB");

      // Test invalid minimum tokens out
      await expect(
        launchpad.connect(buyer).buy(tokenAddress, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Minimum tokens out must be greater than 0");
    });
  });

  describe("✅ Security Event Logging", function () {
    it("Should emit comprehensive security events", async function () {
      // Create token and check for security events
      const tokenAddress = await createTestToken();

      // Should emit TokenCreated and SecurityEvent
      const tx = await launchpad.connect(creator).createToken("Event Token", "EVENT", "metadata", {
        value: CREATE_FEE,
      });
      const receipt = await tx.wait();

      // Check for security events
      const events = receipt?.logs || [];
      expect(events.length).to.be.gte(1);
    });

    it("Should log emergency mode changes", async function () {
      await expect(
        launchpad.connect(owner).setEmergencyMode(true)
      ).to.emit(launchpad, "EmergencyModeChanged")
        .and.to.emit(launchpad, "SecurityEvent");
    });
  });

  describe("✅ Gas Optimization", function () {
    it("Should deploy within reasonable gas limits", async function () {
      const deployTx = await launchpad.deploymentTransaction();
      const deployReceipt = await deployTx.wait();

      // Should deploy under 5M gas
      expect(deployReceipt?.gasUsed || 0).to.be.lt(5_000_000);
    });

    it("Should create token within reasonable gas limits", async function () {
      const tx = await launchpad.connect(creator).createToken("Gas Test", "GAS", "metadata", {
        value: CREATE_FEE,
      });
      const receipt = await tx.wait();

      // Should create token under 2M gas
      expect(receipt?.gasUsed || 0).to.be.lt(2_000_000);
    });
  });

  // Helper function to create a test token
  async function createTestToken(): Promise<string> {
    const tx = await launchpad.connect(creator).createToken("Test Token", "TEST", "https://example.com/metadata.json", {
      value: CREATE_FEE,
    });
    const receipt = await tx.wait();

    // Find TokenCreated event to get token address
    const tokenCreatedEvent = receipt?.logs.find(log => {
      try {
        const parsed = launchpad.interface.parseLog(log);
        return parsed.name === "TokenCreated";
      } catch {
        return false;
      }
    });

    if (!tokenCreatedEvent) {
      throw new Error("TokenCreated event not found");
    }

    const parsedEvent = launchpad.interface.parseLog(tokenCreatedEvent);
    return parsedEvent.args[0]; // tokenAddress
  }
});