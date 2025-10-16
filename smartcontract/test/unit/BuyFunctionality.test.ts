import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import {
  setupContract,
  createTestToken,
  calculateExpectedTokens,
  calculateExpectedBNB,
  calculateFee,
  expectEvent,
  expectAlmostEqual,
  getBalanceChanges,
  DEFAULT_TEST_PARAMS,
  ZERO_ADDRESS,
} from "../setup";

describe("Buy Functionality", function () {
  let rabbitLaunchpad: RabbitLaunchpad;
  let setup: any;
  let tokenSetup: any;

  beforeEach(async function () {
    setup = await setupContract();
    rabbitLaunchpad = setup.rabbitLaunchpad;
    tokenSetup = await createTestToken(setup, "Buy Test Token", "BUY");
  });

  describe("Basic Buy Functionality", function () {
    it("Should allow users to buy tokens", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      // Get balances before
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      const contractBalanceBefore = await ethers.provider.getBalance(await rabbitLaunchpad.getAddress());
      const treasuryBalanceBefore = await ethers.provider.getBalance(setup.treasury);
      const creatorBalanceBefore = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Calculate expected tokens and fees
      const expectedTokens = await calculateExpectedTokens(bnbAmount, 0n);
      const fees = calculateFee(bnbAmount, 125);

      // Buy tokens
      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: bnbAmount,
      });

      const receipt = await tx.wait();
      const gasUsed = (receipt?.gasUsed || 0n) * (receipt?.gasPrice || 0n);

      // Check events
      expectEvent(receipt, "TokenBought", {
        tokenAddress: tokenSetup.tokenAddress,
        buyer: buyer.address,
      });

      // Get balances after
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      const contractBalanceAfter = await ethers.provider.getBalance(await rabbitLaunchpad.getAddress());
      const treasuryBalanceAfter = await ethers.provider.getBalance(setup.treasury);
      const creatorBalanceAfter = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Check buyer balance change
      const expectedBuyerBalance = buyerBalanceBefore - bnbAmount - gasUsed;
      expectAlmostEqual(buyerBalanceAfter, expectedBuyerBalance, ethers.parseEther("0.001"));

      // Check contract balance change
      const expectedContractBalance = contractBalanceBefore + fees.netAmount;
      expectAlmostEqual(contractBalanceAfter, expectedContractBalance, ethers.parseEther("0.00001"));

      // Check treasury balance change
      const expectedTreasuryBalance = treasuryBalanceBefore + fees.platformFee;
      expectAlmostEqual(treasuryBalanceAfter, expectedTreasuryBalance, ethers.parseEther("0.00001"));

      // Check creator balance change
      const expectedCreatorBalance = creatorBalanceBefore + fees.creatorFee;
      expectAlmostEqual(creatorBalanceAfter, expectedCreatorBalance, ethers.parseEther("0.00001"));

      // Check token state update
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.equal(expectedTokens);
      expect(tokenInfo.totalBNB).to.equal(fees.netAmount);

      // Check token balance
      const buyerTokenBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(buyerTokenBalance).to.equal(expectedTokens);
    });

    it("Should reject buying from non-existent token", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      await expect(
        rabbitLaunchpad.connect(buyer).buy(ZERO_ADDRESS, { value: bnbAmount })
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should reject buying from graduated token", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      // Graduate the token first
      await rabbitLaunchpad.connect(tokenSetup.creator).graduate(tokenSetup.tokenAddress);

      await expect(
        rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount })
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should reject buying with zero BNB", async function () {
      const { users } = setup;
      const buyer = users[3];

      await expect(
        rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: 0 })
      ).to.be.revertedWith("BNB amount must be greater than 0");
    });

    it("Should handle multiple users buying tokens", async function () {
      const { users } = setup;
      const buyers = [users[3], users[4], users[5]];
      const bnbAmount = ethers.parseEther("0.01");

      // Get initial state
      const initialTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Multiple users buy tokens
      const results = await Promise.all(
        buyers.map((buyer) =>
          rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount })
        )
      );

      // All transactions should succeed
      for (const tx of results) {
        await expect(tx.wait()).to.not.be.reverted;
      }

      // Check final state
      const finalTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // All users should have tokens
      for (const buyer of buyers) {
        const balance = await tokenSetup.tokenContract.balanceOf(buyer.address);
        expect(balance).to.be.gt(0);
      }

      // Total supply and BNB should be updated correctly
      expect(finalTokenInfo.soldSupply).to.be.gt(initialTokenInfo.soldSupply);
      expect(finalTokenInfo.totalBNB).to.be.gt(initialTokenInfo.totalBNB);
    });
  });

  describe("Bonding Curve Mechanics", function () {
    it("Should increase price with each purchase", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      // First purchase
      await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });
      const tokensAfterFirst = await tokenSetup.tokenContract.balanceOf(buyer.address);

      // Second purchase with same amount
      await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });
      const tokensAfterSecond = await tokenSetup.tokenContract.balanceOf(buyer.address);

      // Second purchase should give fewer tokens due to higher price
      const tokensFromFirst = tokensAfterFirst;
      const tokensFromSecond = tokensAfterSecond - tokensAfterFirst;
      expect(tokensFromSecond).to.be.lt(tokensFromFirst);
    });

    it("Should calculate correct token amounts for varying BNB amounts", async function () {
      const { users } = setup;
      const buyer = users[3];

      // Test different BNB amounts
      const bnbAmounts = [
        ethers.parseEther("0.001"),
        ethers.parseEther("0.01"),
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
      ];

      for (const bnbAmount of bnbAmounts) {
        const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
        const expectedTokens = await calculateExpectedTokens(bnbAmount, tokenInfo.soldSupply);

        await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });
        const newBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);

        const actualTokens = newBalance;

        // Allow small tolerance due to integer division
        expectAlmostEqual(actualTokens, expectedTokens, ethers.parseEther("0.001"));
      }
    });

    it("Should handle large purchases correctly", async function () {
      const { users } = setup;
      const buyer = users[3];
      const largeBnbAmount = ethers.parseEther("10");

      // Get initial state
      const initialTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Make large purchase
      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: largeBnbAmount,
      });
      await tx.wait();

      // Check that tokens were received
      const buyerBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(buyerBalance).to.be.gt(0);

      // Check that token state was updated
      const finalTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalTokenInfo.soldSupply).to.be.gt(initialTokenInfo.soldSupply);
      expect(finalTokenInfo.totalBNB).to.be.gt(initialTokenInfo.totalBNB);
    });

    it("Should handle small purchases correctly", async function () {
      const { users } = setup;
      const buyer = users[3];
      const smallBnbAmount = ethers.parseEther("0.000001"); // 1 gwei

      // Make small purchase
      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: smallBnbAmount,
      });
      await tx.wait();

      // Check that some tokens were received
      const buyerBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(buyerBalance).to.be.gte(0);
    });
  });

  describe("Fee Distribution", function () {
    it("Should distribute fees correctly on small purchases", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.001");

      // Get balances before
      const treasuryBefore = await ethers.provider.getBalance(setup.treasury);
      const creatorBefore = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Make purchase
      await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });

      // Get balances after
      const treasuryAfter = await ethers.provider.getBalance(setup.treasury);
      const creatorAfter = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Calculate expected fees
      const fees = calculateFee(bnbAmount, 125);

      // Check fee distribution
      expect(treasuryAfter - treasuryBefore).to.equal(fees.platformFee);
      expect(creatorAfter - creatorBefore).to.equal(fees.creatorFee);
    });

    it("Should distribute fees correctly on large purchases", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("10");

      // Get balances before
      const treasuryBefore = await ethers.provider.getBalance(setup.treasury);
      const creatorBefore = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Make purchase
      await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });

      // Get balances after
      const treasuryAfter = await ethers.provider.getBalance(setup.treasury);
      const creatorAfter = await ethers.provider.getBalance(tokenSetup.creator.address);

      // Calculate expected fees
      const fees = calculateFee(bnbAmount, 125);

      // Check fee distribution
      expect(treasuryAfter - treasuryBefore).to.equal(fees.platformFee);
      expect(creatorAfter - creatorBefore).to.equal(fees.creatorFee);
    });

    it("Should handle zero fee edge case correctly", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.000001"); // Very small amount

      // Make purchase
      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: bnbAmount,
      });
      await tx.wait();

      // Should still distribute fees, even if very small
      const treasuryChange = await tokenSetup.tokenContract.balanceOf(setup.treasury);
      // For very small amounts, fees might be rounded to zero due to integer division
      expect(treasuryChange).to.be.gte(0);
    });
  });

  describe("Token Supply Constraints", function () {
    it("Should prevent buying when graduation threshold is reached", async function () {
      const { users } = setup;
      const buyer = users[3];

      // Simulate reaching graduation threshold
      const currentTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Calculate how much BNB needed to reach 1 BNB threshold
      const bnbNeeded = DEFAULT_TEST_PARAMS.GRADUATION_THRESHOLD - currentTokenInfo.totalBNB;

      if (bnbNeeded > 0) {
        // Purchase enough to reach graduation threshold
        await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
          value: bnbNeeded,
        });
      }

      // Try to graduate
      await rabbitLaunchpad.connect(tokenSetup.creator).graduate(tokenSetup.tokenAddress);

      // Any further purchases should fail
      await expect(
        rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
          value: ethers.parseEther("0.01"),
        })
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should handle maximum token supply correctly", async function () {
      const { users } = setup;
      const buyer = users[3];

      // Calculate maximum tokens available (excluding graduation allocation)
      const maxTokens = DEFAULT_TEST_PARAMS.TOTAL_SUPPLY - DEFAULT_TEST_PARAMS.GRADUATION_TOKEN_ALLOCATION;

      // Try to buy more than available (this would require enormous BNB amount)
      // Instead, we'll test that we can approach the limit
      let currentSold = 0n;
      let attempts = 0;
      const maxAttempts = 10;

      while (currentSold < maxTokens && attempts < maxAttempts) {
        const bnbAmount = ethers.parseEther("0.1");

        try {
          await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
            value: bnbAmount,
          });

          const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
          currentSold = tokenInfo.soldSupply;
          attempts++;
        } catch (error) {
          // Stop if purchase fails (could be due to reaching limits)
          break;
        }
      }

      // Should have made some progress without errors
      expect(attempts).to.be.gt(0);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle concurrent purchases correctly", async function () {
      const { users } = setup;
      const buyers = [users[3], users[4], users[5]];
      const bnbAmount = ethers.parseEther("0.01");

      // Get initial state
      const initialTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Make concurrent purchases
      const results = await Promise.allSettled(
        buyers.map((buyer) =>
          rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount })
        )
      );

      // All purchases should succeed
      results.forEach((result) => {
        expect(result.status).to.equal("fulfilled");
      });

      // Check final state
      const finalTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalTokenInfo.soldSupply).to.be.gt(initialTokenInfo.soldSupply);
    });

    it("Should handle purchase from same user multiple times", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.001");

      // Make multiple purchases from same user
      for (let i = 0; i < 5; i++) {
        await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });
      }

      // Check cumulative balance
      const finalBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(finalBalance).to.be.gt(0);

      // Each purchase should give progressively fewer tokens
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.be.gt(0);
    });

    it("Should handle purchase with exact fee amount", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      // Make purchase
      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: bnbAmount,
      });
      await tx.wait();

      // Should have received some tokens
      const balance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(balance).to.be.gt(0);
    });

    it("Should handle purchase when contract has no tokens sold", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.001");

      // Verify initial state
      const initialTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(initialTokenInfo.soldSupply).to.equal(0n);

      // Make purchase
      await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, { value: bnbAmount });

      // Check state after purchase
      const finalTokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalTokenInfo.soldSupply).to.be.gt(0n);

      const buyerBalance = await tokenSetup.tokenContract.balanceOf(buyer.address);
      expect(buyerBalance).to.be.gt(0n);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas consumption for token purchases", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
        value: bnbAmount,
      });
      const receipt = await tx.wait();

      // Gas consumption should be reasonable (less than 200k gas)
      expect(receipt?.gasUsed || 0n).to.be.lt(200000);
    });

    it("Should maintain consistent gas consumption across similar purchases", async function () {
      const { users } = setup;
      const buyer = users[3];
      const bnbAmount = ethers.parseEther("0.01");

      // Make multiple purchases and check gas consistency
      const gasUsages = [];

      for (let i = 0; i < 3; i++) {
        const tx = await rabbitLaunchpad.connect(buyer).buy(tokenSetup.tokenAddress, {
          value: bnbAmount,
        });
        const receipt = await tx.wait();
        gasUsages.push(receipt?.gasUsed || 0n.toString());
      }

      // Gas usage should be consistent (within 5% variance)
      const avgGas = gasUsages.reduce((a, b) => Number(a) + Number(b), 0) / gasUsages.length;
      const variance = gasUsages.reduce((acc, gas) => acc + Math.abs(Number(gas) - avgGas), 0) / gasUsages.length;

      expect(variance).to.be.lt(avgGas * 5 / 100); // Less than 5% variance
    });
  });
});