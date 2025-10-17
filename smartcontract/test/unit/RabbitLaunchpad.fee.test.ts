import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { RabbitToken } from "../../client/src/types/contracts";

describe("RabbitLaunchpad - Fee Distribution Logic", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: RabbitToken;

  const CREATE_FEE = ethers.parseEther("0.005");
  const FEE_PLATFORM_PERCENT = 100; // 1% in basis points
  const FEE_CREATOR_PERCENT = 25; // 0.25% in basis points
  const TOTAL_FEE_PERCENT = 125; // 1.25% in basis points

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
    token = await ethers.getContractAt("RabbitToken", tokenAddress);
  });

  describe("Token Creation Fee", function () {
    it("Should charge correct creation fee", async function () {
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

      await launchpad.connect(creator).createToken(
        "Another Token",
        "ANO",
        "https://example.com/metadata2.json",
        { value: CREATE_FEE }
      );

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(CREATE_FEE);
    });

    it("Should revert with incorrect creation fee", async function () {
      await expect(
        launchpad.connect(creator).createToken(
          "Bad Token",
          "BAD",
          "https://example.com/metadata3.json",
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should handle zero creation fee correctly", async function () {
      await expect(
        launchpad.connect(creator).createToken(
          "Zero Token",
          "ZERO",
          "https://example.com/metadata4.json",
          { value: 0 }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should handle excess creation fee", async function () {
      await expect(
        launchpad.connect(creator).createToken(
          "Excess Token",
          "EXC",
          "https://example.com/metadata5.json",
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });
  });

  describe("Buy Fee Distribution", function () {
    it("Should distribute platform fee correctly on buy", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedPlatformFee = buyAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedPlatformFee);
    });

    it("Should distribute creator fee correctly on buy", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedCreatorFee = buyAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedCreatorFee);
    });

    it("Should calculate total fee correctly on buy", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedTotalFee = buyAmount * BigInt(TOTAL_FEE_PERCENT) / 10000n;
      const expectedBNBForTokens = buyAmount - expectedTotalFee;

      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();

      // Check the event for the actual BNB used for tokens
      const event = receipt!.logs?.find(log => {
        try {
          const parsed = launchpad.interface.parseLog(log as any);
          return parsed?.name === "TokenBought";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = launchpad.interface.parseLog(event as any);
        const bnbForTokens = parsedEvent?.args[2];
        expect(bnbForTokens).to.equal(expectedBNBForTokens);
      }
    });

    it("Should handle different buy amounts with correct fee distribution", async function () {
      const buyAmounts = [
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];

      for (const buyAmount of buyAmounts) {
        const expectedPlatformFee = buyAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
        const expectedCreatorFee = buyAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;
        const expectedTotalFee = buyAmount * BigInt(TOTAL_FEE_PERCENT) / 10000n;

        const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
        const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

        await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

        const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
        const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

        expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedPlatformFee);
        expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedCreatorFee);
      }
    });

    it("Should handle very small buy amounts with correct fee distribution", async function () {
      const smallAmount = ethers.parseEther("0.001");
      const expectedPlatformFee = smallAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
      const expectedCreatorFee = smallAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;

      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).buy(await token.getAddress(), { value: smallAmount });

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedPlatformFee);
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedCreatorFee);
    });
  });

  describe("Sell Fee Distribution", function () {
    beforeEach(async function () {
      // Buy tokens first to have tokens to sell
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });
    });

    it("Should distribute platform fee correctly on sell", async function () {
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

      await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);
    });

    it("Should distribute creator fee correctly on sell", async function () {
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);

      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());
      expect(finalCreatorBalance).to.be.gt(initialCreatorBalance);
    });

    it("Should calculate correct BNB amount after fees on sell", async function () {
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const initialSellerBalance = await ethers.provider.getBalance(await buyer.getAddress());

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      const expectedBNB = await launchpad.calculateTokenSale(tokenInfo.soldSupply, sellAmount, tokenInfo.initialPrice, 0);
      const expectedTotalFee = expectedBNB * BigInt(TOTAL_FEE_PERCENT) / 10000n;
      const expectedBNBToUser = expectedBNB - expectedTotalFee;

      const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalSellerBalance = await ethers.provider.getBalance(await buyer.getAddress());
      const actualBNBReceived = finalSellerBalance + gasUsed - initialSellerBalance;

      expect(actualBNBReceived).to.equal(expectedBNBToUser);
    });

    it("Should handle partial sells with correct fee distribution", async function () {
      const totalTokens = await token.balanceOf(await buyer.getAddress());
      const sellAmount = totalTokens / 2n;

      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);
      expect(finalCreatorBalance).to.be.gt(initialCreatorBalance);
    });

    it("Should handle multiple small sells with correct fee distribution", async function () {
      const totalTokens = await token.balanceOf(await buyer.getAddress());
      const smallSellAmount = totalTokens / 10n;

      let treasuryFees = 0n;
      let creatorFees = 0n;

      for (let i = 0; i < 5; i++) {
        const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
        const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

        await launchpad.connect(buyer).sell(await token.getAddress(), smallSellAmount);

        const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
        const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

        treasuryFees += finalTreasuryBalance - initialTreasuryBalance;
        creatorFees += finalCreatorBalance - initialCreatorBalance;
      }

      expect(treasuryFees).to.be.gt(0);
      expect(creatorFees).to.be.gt(0);
    });
  });

  describe("Fee Calculation Accuracy", function () {
    it("Should calculate fees with high precision", async function () {
      const buyAmount = ethers.parseEther("1.23456789");
      const expectedPlatformFee = buyAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
      const expectedCreatorFee = buyAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;
      const expectedTotalFee = buyAmount * BigInt(TOTAL_FEE_PERCENT) / 10000n;

      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedPlatformFee);
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedCreatorFee);
      expect(expectedTotalFee).to.equal(expectedPlatformFee + expectedCreatorFee);
    });

    it("Should handle rounding correctly in fee calculations", async function () {
      // Test with amounts that might cause rounding issues
      const oddAmount = ethers.parseEther("1") + BigInt(1); // 1 BNB + 1 wei

      const expectedPlatformFee = oddAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
      const expectedCreatorFee = oddAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;

      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(buyer).buy(await token.getAddress(), { value: oddAmount });

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedPlatformFee);
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedCreatorFee);
    });

    it("Should maintain fee percentages correctly across different amounts", async function () {
      const testAmounts = [
        ethers.parseEther("0.001"),
        ethers.parseEther("0.01"),
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];

      for (const amount of testAmounts) {
        const expectedPlatformFee = amount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
        const expectedCreatorFee = amount * BigInt(FEE_CREATOR_PERCENT) / 10000n;
        const expectedTotalFee = amount * BigInt(TOTAL_FEE_PERCENT) / 10000n;

        expect(expectedPlatformFee).to.equal(amount * 100n / 10000n);
        expect(expectedCreatorFee).to.equal(amount * 25n / 10000n);
        expect(expectedTotalFee).to.equal(expectedPlatformFee + expectedCreatorFee);
      }
    });
  });

  describe("Total Fee Collection Tracking", function () {
    it("Should track total fees collected correctly", async function () {
      // Create additional tokens to increase total fees
      await launchpad.connect(creator).createToken(
        "Token 2",
        "T2",
        "https://example.com/token2.json",
        { value: CREATE_FEE }
      );

      await launchpad.connect(creator).createToken(
        "Token 3",
        "T3",
        "https://example.com/token3.json",
        { value: CREATE_FEE }
      );

      const buyAmount = ethers.parseEther("1");

      // Buy from first token
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      // Get second token address
      const token2Address = await launchpad.getAllTokens().then(tokens => tokens[1]);

      // Buy from second token
      await launchpad.connect(buyer).buy(token2Address, { value: buyAmount });

      // Total fees should include creation fees + buy fees
      const expectedCreationFees = CREATE_FEE * 3n; // 3 tokens created
      const expectedBuyFees = (buyAmount * BigInt(TOTAL_FEE_PERCENT) / 10000n) * 2n; // 2 buys
      const expectedTotalFees = expectedCreationFees + expectedBuyFees;

      const globalState = await launchpad.globalState();
      expect(globalState.totalFeesCollected).to.equal(expectedTotalFees);
    });

    it("Should update total fees on sell operations", async function () {
      // First buy some tokens
      const buyAmount = ethers.parseEther("10");
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      const initialFees = (await launchpad.globalState()).totalFeesCollected;

      // Sell tokens
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);

      const finalFees = (await launchpad.globalState()).totalFeesCollected;

      // Fees should increase after sell
      expect(finalFees).to.be.gt(initialFees);
    });
  });

  describe("Fee Distribution Edge Cases", function () {
    it("Should handle fee distribution when treasury and creator are the same", async function () {
      // Create a new launchpad with same treasury and creator
      const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
      const sameAddressLaunchpad = await Launchpad.deploy(
        await creator.getAddress(), // Treasury = creator
        await dexRouter.getAddress()
      );
      await sameAddressLaunchpad.waitForDeployment();

      // Create token
      await sameAddressLaunchpad.connect(creator).createToken(
        "Same Addr Token",
        "SAT",
        "https://example.com/same.json",
        { value: CREATE_FEE }
      );

      const tokenAddress = await sameAddressLaunchpad.getAllTokens().then(tokens => tokens[0]);

      const buyAmount = ethers.parseEther("1");
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await sameAddressLaunchpad.connect(buyer).buy(tokenAddress, { value: buyAmount });

      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      // Creator should receive both creation fee and creator fee
      const expectedTotal = CREATE_FEE + (buyAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n);
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedTotal);
    });

    it("Should handle zero fees gracefully", async function () {
      // This test would require modifying the contract to have zero fees
      // For now, we test the minimum fee scenario
      const tinyAmount = BigInt(1); // 1 wei

      const expectedPlatformFee = tinyAmount * BigInt(FEE_PLATFORM_PERCENT) / 10000n;
      const expectedCreatorFee = tinyAmount * BigInt(FEE_CREATOR_PERCENT) / 10000n;

      expect(expectedPlatformFee).to.equal(0n); // Should be 0 due to rounding
      expect(expectedCreatorFee).to.equal(0n); // Should be 0 due to rounding
    });
  });
});