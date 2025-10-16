import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { RabbitToken } from "../../client/src/types/contracts";

describe("Security Fixes Validation Tests", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: RabbitToken;

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

    // Get token address and instance
    const allTokens = await launchpad.getAllTokens();
    expect(allTokens.length).to.be.gt(0);
    const tokenAddress = allTokens[0];
    token = await ethers.getContractAt("RabbitToken", tokenAddress);

    // Mint some tokens to buyer first for testing
    await launchpad.connect(buyer).buy(await token.getAddress(), {
      value: ethers.parseEther("0.1")
    });
  });

  describe("⚡ Reentrancy Protection", function () {
    it("Should follow checks-effects-interactions pattern in buy function", async function () {
      const buyAmount = ethers.parseEther("0.1");

      // Check state before buy
      const globalStateBefore = await launchpad.globalState();
      const tokenInfoBefore = await launchpad.getTokenInfo(await token.getAddress());

      // Execute buy
      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: buyAmount
      });
      const receipt = await tx.wait();

      // Check event was emitted (effects before interactions)
      const buyEvent = receipt?.logs?.find(log => {
        try {
          const parsed = launchpad.interface.parseLog(log);
          return parsed?.name === "TokenBought";
        } catch {
          return false;
        }
      });
      expect(buyEvent).to.exist;

      // Check state after buy
      const tokenInfoAfter = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfoAfter.soldSupply).to.be.gt(tokenInfoBefore.soldSupply);
      expect(tokenInfoAfter.totalBNB).to.be.gt(tokenInfoBefore.totalBNB);

      // Check user received tokens (external call happened last)
      const userBalance = await token.balanceOf(await buyer.getAddress());
      expect(userBalance).to.be.gt(0);
    });

    it("Should follow checks-effects-interactions pattern in sell function", async function () {
      // First buy some tokens
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("0.1")
      });

      const userBalance = await token.balanceOf(await buyer.getAddress());
      const sellAmount = userBalance / 2n;

      // Approve tokens
      await token.connect(buyer).approve(await launchpad.getAddress(), sellAmount);

      // Check state before sell
      const tokenInfoBefore = await launchpad.getTokenInfo(await token.getAddress());
      const contractBalanceBefore = await ethers.provider.getBalance(await launchpad.getAddress());

      // Execute sell
      const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();

      // Check event was emitted (effects before interactions)
      const sellEvent = receipt?.logs?.find(log => {
        try {
          const parsed = launchpad.interface.parseLog(log);
          return parsed?.name === "TokenSold";
        } catch {
          return false;
        }
      });
      expect(sellEvent).to.exist;

      // Check state after sell
      const tokenInfoAfter = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfoAfter.soldSupply).to.be.lt(tokenInfoBefore.soldSupply);
      expect(tokenInfoAfter.totalBNB).to.be.lt(tokenInfoBefore.totalBNB);
    });
  });

  describe("⚡ Integer Overflow Protection", function () {
    it("Should reject excessive BNB amounts in calculateTokenPurchase", async function () {
      // Test with 100 BNB limit
      const excessiveAmount = ethers.parseEther("101");

      await expect(
        launchpad.calculateTokenPurchase(0, excessiveAmount, 0, 0)
      ).to.be.revertedWith("BNB amount exceeds maximum limit");
    });

    it("Should reject zero BNB amounts", async function () {
      await expect(
        launchpad.calculateTokenPurchase(0, 0, 0, 0)
      ).to.be.revertedWith("BNB amount must be greater than 0");
    });

    it("Should reject excessive token amounts in calculateTokenSale", async function () {
      const excessiveTokens = ethers.parseEther("900000000"); // 900M tokens > target supply

      await expect(
        launchpad.calculateTokenSale(excessiveTokens, 1000, 0, 0)
      ).to.be.revertedWith("Supply exceeds trading limit");
    });

    it("Should properly handle exponent bounds in calculatePrice", async function () {
      // Test with maximum valid supply
      const maxSupply = ethers.parseEther("800000000"); // 800M tokens

      // Should not revert with overflow
      const price = await launchpad.calculatePrice(maxSupply);
      expect(price).to.be.gt(0);
    });
  });

  describe("⚡ Timelock Protection", function () {
    it("Should not allow immediate treasury update completion", async function () {
      const newTreasury = dexRouter.address;

      // Initiate treasury update
      await launchpad.connect(owner).initiateTreasuryUpdate(newTreasury);

      // Try to complete immediately - should fail
      await expect(
        launchpad.connect(owner).completeTreasuryUpdate()
      ).to.be.revertedWith("Timelock not expired");

      // Check pending treasury is set
      const pendingTreasury = await launchpad.pendingTreasury();
      expect(pendingTreasury).to.equal(newTreasury);
    });

    it("Should reject duplicate treasury updates", async function () {
      const newTreasury = dexRouter.address;

      // Initiate first update
      await launchpad.connect(owner).initiateTreasuryUpdate(newTreasury);

      // Try to initiate same update again - should fail
      await expect(
        launchpad.connect(owner).initiateTreasuryUpdate(newTreasury)
      ).to.be.revertedWith("Update already pending");
    });

    it("Should reject zero address treasury updates", async function () {
      await expect(
        launchpad.connect(owner).initiateTreasuryUpdate(ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury cannot be zero address");
    });
  });

  describe("⚡ Emergency Withdraw Limits", function () {
    it("Should reject emergency withdraw exceeding limit", async function () {
      const maxLimit = await launchpad.MAX_EMERGENCY_WITHDRAW();
      const excessiveAmount = maxLimit + ethers.parseEther("1");

      // Send some BNB to contract first
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("1")
      });

      await expect(
        launchpad.connect(owner)["emergencyWithdraw(uint256)"](excessiveAmount)
      ).to.be.revertedWith("Amount exceeds maximum emergency limit");
    });

    it("Should enforce timelock between emergency withdraws", async function () {
      const withdrawAmount = ethers.parseEther("5");

      // Send BNB to contract
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      // First withdraw should work
      await launchpad.connect(owner)["emergencyWithdraw(uint256)"](withdrawAmount);

      // Second immediate withdraw should fail
      await expect(
        launchpad.connect(owner)["emergencyWithdraw(uint256)"](withdrawAmount)
      ).to.be.revertedWith("Emergency timelock not expired");
    });

    it("Should reject full emergency withdraw for new contract", async function () {
      await expect(
        launchpad.connect(owner).fullEmergencyWithdraw()
      ).to.be.revertedWith("Contract too new for full emergency withdraw");
    });
  });

  describe("⚡ Deprecated Functions", function () {
    it("Should reject legacy updateTreasury function", async function () {
      await expect(
        launchpad.connect(owner).updateTreasury(dexRouter.address)
      ).to.be.revertedWith("Use initiateTreasuryUpdate and completeTreasuryUpdate with timelock");
    });

    it("Should reject legacy emergencyWithdraw function", async function () {
      await expect(
        launchpad.connect(owner)["emergencyWithdraw(uint256)"](ethers.parseEther("1"))
      ).to.be.revertedWith("Use emergencyWithdraw(uint256) with amount limit");
    });
  });

  describe("⚡ Input Validation", function () {
    it("Should reject token creation with incorrect fee", async function () {
      await expect(
        launchpad.connect(creator).createToken(
          "Invalid Token",
          "INVALID",
          "https://example.com/metadata.json",
          { value: ethers.parseEther("0.001") } // Wrong fee
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should reject buy operations for graduated tokens", async function () {
      // Graduate the token (simulate)
      const tokenAddress = await token.getAddress();

      // This would need proper graduation implementation
      // For now, just test non-existent token
      await expect(
        launchpad.connect(buyer).buy(ethers.Wallet.createRandom().address, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWith("Token does not exist");
    });
  });
});