import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad, AhiruToken } from "../../client/src/types/contracts";
const any = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("RabbitLaunchpad - Buy Functionality", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: AhiruToken;

  const CREATE_FEE = ethers.parseEther("0.005");
  const INITIAL_PRICE = ethers.parseEther("0.0000005");
  const TOTAL_SUPPLY = ethers.parseEther("1000000000");

  beforeEach(async function () {
    [owner, creator, buyer1, buyer2, treasury, dexRouter] = await ethers.getSigners();

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

    // Get token address using getAllTokens()
    const allTokens = await launchpad.getAllTokens();
    expect(allTokens.length).to.be.gt(0);
    const tokenAddress = allTokens[0];
    token = await ethers.getContractAt("AhiruToken", tokenAddress);
  });

  describe("Basic Buy Functionality", function () {
    it("Should allow users to buy tokens", async function () {
      const buyAmount = ethers.parseEther("1");

      await expect(
        launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount })
      ).to.emit(launchpad, "TokenBought")
        .withArgs(
          await token.getAddress(),
          await buyer1.getAddress(),
          buyAmount - (buyAmount * 125n / 10000n), // BNB after fees
          any, // token amount
          any  // timestamp
        );

      const buyerBalance = await token.balanceOf(await buyer1.getAddress());
      expect(buyerBalance).to.be.gt(0);
    });

    it("Should transfer correct amount of tokens to buyer", async function () {
      const buyAmount = ethers.parseEther("1");

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });

      const buyerBalance = await token.balanceOf(await buyer1.getAddress());
      const expectedTokens = await launchpad.calculateTokenPurchase(
        0,
        buyAmount - (buyAmount * 125n / 10000n),
        INITIAL_PRICE,
        5 * 10**19
      );

      expect(buyerBalance).to.equal(expectedTokens);
    });

    it("Should update token state correctly after purchase", async function () {
      const buyAmount = ethers.parseEther("1");

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfo.soldSupply).to.be.gt(0);
      expect(tokenInfo.totalBNB).to.equal(buyAmount - (buyAmount * 125n / 10000n));
    });
  });

  describe("Buy Edge Cases", function () {
    it("Should revert with zero BNB amount", async function () {
      await expect(
        launchpad.connect(buyer1).buy(await token.getAddress(), { value: 0 })
      ).to.be.revertedWith("BNB amount must be greater than 0");
    });

    it("Should revert when buying non-existent token", async function () {
      const randomAddress = ethers.Wallet.createRandom().address;
      const buyAmount = ethers.parseEther("1");

      await expect(
        launchpad.connect(buyer1).buy(randomAddress, { value: buyAmount })
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should revert when buying graduated token", async function () {
      // First buy enough to graduate
      const largeAmount = ethers.parseEther("2000");
      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: largeAmount });

      // Graduate the token
      await launchpad.connect(creator).graduate(await token.getAddress());

      // Try to buy after graduation
      await expect(
        launchpad.connect(buyer2).buy(await token.getAddress(), { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should handle very small buy amounts", async function () {
      const tinyAmount = ethers.parseEther("0.001");

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: tinyAmount });

      const buyerBalance = await token.balanceOf(await buyer1.getAddress());
      expect(buyerBalance).to.be.gt(0);
    });

    it("Should handle multiple buys from same user", async function () {
      const buyAmount = ethers.parseEther("1");

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      const firstBalance = await token.balanceOf(await buyer1.getAddress());

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      const secondBalance = await token.balanceOf(await buyer1.getAddress());

      expect(secondBalance).to.be.gt(firstBalance);
    });

    it("Should handle multiple buys from different users", async function () {
      const buyAmount = ethers.parseEther("1");

      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      await launchpad.connect(buyer2).buy(await token.getAddress(), { value: buyAmount });

      const buyer1Balance = await token.balanceOf(await buyer1.getAddress());
      const buyer2Balance = await token.balanceOf(await buyer2.getAddress());

      expect(buyer1Balance).to.be.gt(0);
      expect(buyer2Balance).to.be.gt(0);
      expect(buyer1Balance).to.equal(buyer2Balance);
    });

    it("Should increase price with bonding curve", async function () {
      const buyAmount = ethers.parseEther("1");

      // First buy
      await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      const firstTokens = await token.balanceOf(await buyer1.getAddress());

      // Second buy with same BNB amount
      await launchpad.connect(buyer2).buy(await token.getAddress(), { value: buyAmount });
      const secondTokens = await token.balanceOf(await buyer2.getAddress());

      // Second buy should get fewer tokens due to price increase
      expect(secondTokens).to.be.lt(firstTokens);
    });

    it("Should revert when trying to buy more than available tokens", async function () {
      // Try to buy more than the 80% available for bonding curve
      const hugeAmount = ethers.parseEther("100000");

      await expect(
        launchpad.connect(buyer1).buy(await token.getAddress(), { value: hugeAmount })
      ).to.be.revertedWith("Not enough tokens available");
    });
  });

  describe("Fee Distribution", function () {
    it("Should distribute platform fee correctly", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedPlatformFee = buyAmount * 100n / 10000n; // 1%
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

      const tx = await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      const expectedBalance = initialTreasuryBalance + expectedPlatformFee;

      expect(finalTreasuryBalance).to.equal(expectedBalance);
    });

    it("Should distribute creator fee correctly", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedCreatorFee = buyAmount * 25n / 10000n; // 0.25%
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      const tx = await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());
      const expectedBalance = initialCreatorBalance + expectedCreatorFee;

      expect(finalCreatorBalance).to.equal(expectedBalance);
    });

    it("Should calculate total fee correctly", async function () {
      const buyAmount = ethers.parseEther("1");
      const expectedTotalFee = buyAmount * 125n / 10000n; // 1.25%
      const expectedBNBForTokens = buyAmount - expectedTotalFee;

      const tx = await launchpad.connect(buyer1).buy(await token.getAddress(), { value: buyAmount });
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
  });
});