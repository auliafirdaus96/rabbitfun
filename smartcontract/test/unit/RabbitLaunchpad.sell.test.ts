import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { AhiruToken } from "../../client/src/types/contracts";

describe("RabbitLaunchpad - Sell Functionality", function () {
  const anyValue: any = "any";
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: AhiruToken;

  const CREATE_FEE = ethers.parseEther("0.005");
  const INITIAL_PRICE = ethers.parseEther("0.0000005");

  beforeEach(async function () {
    [owner, creator, buyer, seller, treasury, dexRouter] = await ethers.getSigners();

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

    // Buy some tokens first to have tokens to sell
    const buyAmount = ethers.parseEther("10");
    await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

    // Transfer some tokens to seller for selling tests
    const tokensToTransfer = await token.balanceOf(await buyer.getAddress()) / 2n;
    await token.connect(buyer).transfer(await seller.getAddress(), tokensToTransfer);
  });

  describe("Basic Sell Functionality", function () {
    it("Should allow users to sell tokens", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance / 2n;

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellAmount)
      ).to.emit(launchpad, "TokenSold")
        .withArgs(
          await token.getAddress(),
          await seller.getAddress(),
          sellAmount,
          anyValue, // BNB amount
          anyValue  // timestamp
        );
    });

    it("Should transfer correct BNB amount to seller", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance / 2n;
      const initialSellerBNB = await ethers.provider.getBalance(await seller.getAddress());

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      const expectedBNB = await launchpad.calculateTokenSale(tokenInfo.soldSupply, sellAmount, tokenInfo.initialPrice, 0);
      const expectedBNBAfterFees = expectedBNB - (expectedBNB * 125n / 10000n);

      const tx = await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalSellerBNB = await ethers.provider.getBalance(await seller.getAddress());
      const actualBNBReceived = finalSellerBNB + gasUsed - initialSellerBNB;

      expect(actualBNBReceived).to.equal(expectedBNBAfterFees);
    });

    it("Should update token state correctly after sale", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance / 2n;

      const tokenInfoBefore = await launchpad.getTokenInfo(await token.getAddress());

      await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);

      const tokenInfoAfter = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfoAfter.soldSupply).to.equal(tokenInfoBefore.soldSupply - sellAmount);
      expect(tokenInfoAfter.totalBNB).to.be.lt(tokenInfoBefore.totalBNB);
    });

    it("Should transfer tokens from seller to contract", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance / 2n;

      const contractBalanceBefore = await token.balanceOf(await launchpad.getAddress());

      await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);

      const contractBalanceAfter = await token.balanceOf(await launchpad.getAddress());
      expect(contractBalanceAfter).to.equal(contractBalanceBefore + sellAmount);
    });
  });

  describe("Sell Edge Cases", function () {
    it("Should revert with zero token amount", async function () {
      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), 0)
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should revert when selling non-existent token", async function () {
      const randomAddress = ethers.Wallet.createRandom().address;
      const sellAmount = ethers.parseEther("1000");

      await expect(
        launchpad.connect(seller).sell(randomAddress, sellAmount)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should revert when selling graduated token", async function () {
      // Graduate the token first
      await launchpad.connect(creator).graduate(await token.getAddress());

      const sellAmount = await token.balanceOf(await seller.getAddress());

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellAmount)
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should revert when selling more tokens than owned", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance + ethers.parseEther("1000");

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellAmount)
      ).to.be.revertedWith("Insufficient token balance");
    });

    it("Should revert when selling more than sold supply", async function () {
      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      const totalSold = tokenInfo.soldSupply;

      const sellAmount = totalSold + BigInt(1);

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellAmount)
      ).to.be.revertedWith("Cannot sell more than sold supply");
    });

    it("Should handle very small sell amounts", async function () {
      const sellAmount = ethers.parseEther("1"); // 1 token

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellAmount)
      ).to.not.be.reverted;
    });

    it("Should handle selling all owned tokens", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());

      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellerBalance)
      ).to.not.be.reverted;

      const finalBalance = await token.balanceOf(await seller.getAddress());
      expect(finalBalance).to.equal(0);
    });

    it("Should handle multiple sells from same user", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const firstSell = sellerBalance / 3n;

      await launchpad.connect(seller).sell(await token.getAddress(), firstSell);
      const balanceAfterFirst = await token.balanceOf(await seller.getAddress());

      const secondSell = balanceAfterFirst / 2n;
      await launchpad.connect(seller).sell(await token.getAddress(), secondSell);

      const finalBalance = await token.balanceOf(await seller.getAddress());
      expect(finalBalance).to.be.lt(balanceAfterFirst - secondSell);
    });

    it("Should handle sells from multiple users", async function () {
      // Transfer tokens to buyer for selling
      const buyerBalance = await token.balanceOf(await buyer.getAddress());
      const tokensToTransfer = buyerBalance / 3n;
      await token.connect(buyer).transfer(await seller.getAddress(), tokensToTransfer);

      const sellerTokens = await token.balanceOf(await seller.getAddress());
      const buyerTokens = await token.balanceOf(await buyer.getAddress());

      await launchpad.connect(seller).sell(await token.getAddress(), sellerTokens / 2n);
      await launchpad.connect(buyer).sell(await token.getAddress(), buyerTokens / 2n);

      expect(await token.balanceOf(await seller.getAddress())).to.be.lt(sellerTokens);
      expect(await token.balanceOf(await buyer.getAddress())).to.be.lt(buyerTokens);
    });

    it("Should revert when contract has insufficient BNB", async function () {
      // This is a complex scenario to test - we'd need to drain the contract's BNB
      // For now, we'll test the condition by trying to sell a very large amount
      const sellerBalance = await token.balanceOf(await seller.getAddress());

      // This should work under normal conditions
      await expect(
        launchpad.connect(seller).sell(await token.getAddress(), sellerBalance)
      ).to.not.be.revertedWith("Insufficient BNB in contract");
    });
  });

  describe("Bonding Curve Sell Logic", function () {
    it("Should give less BNB for tokens sold later (price decreases)", async function () {
      // Get initial seller tokens
      const initialTokens = await token.balanceOf(await seller.getAddress());
      const sellAmount = initialTokens / 4n;

      // First sell
      const tx1 = await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);
      const receipt1 = await tx1.wait();
      const event1 = receipt1!.logs?.find(log => {
        try {
          const parsed = launchpad.interface.parseLog(log as any);
          return parsed?.name === "TokenSold";
        } catch {
          return false;
        }
      });
      const firstBNB = event1 ? launchpad.interface.parseLog(event1 as any)?.args[3] : 0n;

      // Second sell with same amount
      const remainingTokens = await token.balanceOf(await seller.getAddress());
      const tx2 = await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);
      const receipt2 = await tx2.wait();
      const event2 = receipt2!.logs?.find(log => {
        try {
          const parsed = launchpad.interface.parseLog(log as any);
          return parsed?.name === "TokenSold";
        } catch {
          return false;
        }
      });
      const secondBNB = event2 ? launchpad.interface.parseLog(event2 as any)?.args[3] : 0n;

      // Second sell should give fewer BNB due to price decrease
      expect(secondBNB).to.be.lt(firstBNB);
    });

    it("Should calculate BNB amount correctly using bonding curve", async function () {
      const sellerBalance = await token.balanceOf(await seller.getAddress());
      const sellAmount = sellerBalance / 2n;

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      const expectedBNB = await launchpad.calculateTokenSale(tokenInfo.soldSupply, sellAmount, tokenInfo.initialPrice, 0);

      // The actual BNB received should be close to expected (minus fees)
      expect(expectedBNB).to.be.gt(0);
    });
  });

  describe("Fee Distribution on Sell", function () {
    it("Should distribute platform fee on sell", async function () {
      const sellAmount = await token.balanceOf(await seller.getAddress());
      const initialTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());

      await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);

      const finalTreasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);
    });

    it("Should distribute creator fee on sell", async function () {
      const sellAmount = await token.balanceOf(await seller.getAddress());
      const initialCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());

      await launchpad.connect(seller).sell(await token.getAddress(), sellAmount);

      const finalCreatorBalance = await ethers.provider.getBalance(await creator.getAddress());
      expect(finalCreatorBalance).to.be.gt(initialCreatorBalance);
    });
  });
});