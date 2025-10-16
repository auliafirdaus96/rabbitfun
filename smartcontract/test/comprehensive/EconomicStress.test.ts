import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import {
  setupContract,
  createTestToken,
  DEFAULT_TEST_PARAMS,
  getLatestTokenAddress
} from "../setup";

describe("Economic Stress Tests", function () {
  let rabbitLaunchpad: RabbitLaunchpad;
  let setup: any;
  let users: any[];

  beforeEach(async function () {
    const contractSetup = await setupContract();
    rabbitLaunchpad = contractSetup.rabbitLaunchpad;
    users = contractSetup.users;
  });

  describe("📈 High Volume Trading", function () {
    it("Should handle 100 concurrent buy operations", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);
      const buyAmount = ethers.parseEther("0.01"); // Small amount for many transactions

      // Prepare 100 concurrent transactions
      const transactions = [];
      for (let i = 1; i <= 10; i++) { // Using 10 users with 10 transactions each
        for (let j = 0; j < 10; j++) {
          transactions.push(
            rabbitLaunchpad.connect(users[i]).buy(
              tokenSetup.tokenAddress,
              1, // Minimum tokens
              { value: buyAmount }
            )
          );
        }
      }

      // Execute all transactions
      const results = await Promise.allSettled(transactions);

      // Count successful transactions
      let successfulCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulCount++;
        }
      }

      // At least 90% should succeed
      expect(successfulCount).to.be.gte(90);

      // Verify final state
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.be.gt(0);
      expect(tokenInfo.totalBNB).to.be.gte(buyAmount * BigInt(successfulCount));
    });

    it("Should handle mixed buy/sell operations under stress", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);
      const buyAmount = ethers.parseEther("0.1");

      // Phase 1: Build up liquidity
      const buyTransactions = [];
      for (let i = 1; i <= 5; i++) {
        buyTransactions.push(
          rabbitLaunchpad.connect(users[i]).buy(
            tokenSetup.tokenAddress,
            1,
            { value: buyAmount }
          )
        );
      }

      await Promise.all(buyTransactions);

      // Phase 2: Mixed operations
      const mixedTransactions = [];
      for (let i = 1; i <= 5; i++) {
        // Buy
        mixedTransactions.push(
          rabbitLaunchpad.connect(users[i]).buy(
            tokenSetup.tokenAddress,
            1,
            { value: ethers.parseEther("0.01") }
          )
        );

        // Sell (after getting tokens)
        const tokenContract = await ethers.getContractAt("RabbitToken", tokenSetup.tokenAddress);
        const balance = await tokenContract.balanceOf(users[i].address);

        if (balance > 0) {
          mixedTransactions.push(
            rabbitLaunchpad.connect(users[i]).sell(
              tokenSetup.tokenAddress,
              balance / 2n, // Sell half
              0
            )
          );
        }
      }

      await Promise.allSettled(mixedTransactions);

      // Verify system is still functional
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.exists).to.be.true;
    });

    it("Should handle extreme price scenarios", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Very large buy to spike price
      const largeBuy = ethers.parseEther("50");
      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: largeBuy
      });

      const highPriceInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Try to buy at high price (should require more BNB for same tokens)
      await expect(
        rabbitLaunchpad.connect(users[2]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.reverted; // Should fail due to slippage

      // Should succeed with sufficient BNB
      await rabbitLaunchpad.connect(users[2]).buy(
        tokenSetup.tokenAddress,
        1000,
        { value: ethers.parseEther("10") }
      );

      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.totalBNB).to.be.gt(highPriceInfo.totalBNB);
    });
  });

  describe("💰 Fee Stress Tests", function () {
    it("Should handle maximum fee scenarios", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Create tokens with maximum fees
      const maxFeeTransactions = [];
      for (let i = 1; i <= 10; i++) {
        maxFeeTransactions.push(
          rabbitLaunchpad.connect(users[i]).createToken(
            `Max Fee Token ${i}`,
            `MAX${i}`,
            `Maximum fee test token ${i}`,
            { value: ethers.parseEther("0.005") }
          )
        );
      }

      await Promise.all(maxFeeTransactions);

      // Verify all tokens created successfully
      for (let i = 1; i <= 10; i++) {
        const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);
        const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
        expect(tokenInfo.exists).to.be.true;
      }

      // Check treasury received fees
      const treasuryBalance = await ethers.provider.getBalance(await rabbitLaunchpad.treasury());
      expect(treasuryBalance).to.be.gte(ethers.parseEther("0.05")); // At least 10 * 0.005
    });

    it("Should distribute fees correctly under high volume", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      const creatorInitialBalance = await ethers.provider.getBalance(users[0].address);
      const treasuryInitialBalance = await ethers.provider.getBalance(await rabbitLaunchpad.treasury());

      // High volume trading
      const transactions = [];
      for (let i = 1; i <= 5; i++) {
        transactions.push(
          rabbitLaunchpad.connect(users[i]).buy(
            tokenSetup.tokenAddress,
            1000,
            { value: ethers.parseEther("1") }
          )
        );
      }

      await Promise.all(transactions);

      // Check fee distribution
      const creatorFinalBalance = await ethers.provider.getBalance(users[0].address);
      const treasuryFinalBalance = await ethers.provider.getBalance(await rabbitLaunchpad.treasury());

      const creatorFees = creatorFinalBalance - creatorInitialBalance;
      const treasuryFees = treasuryFinalBalance - treasuryInitialBalance;

      // Verify fees were distributed
      expect(creatorFees).to.be.gt(0);
      expect(treasuryFees).to.be.gt(0);

      // Fee rates should be respected (1% to treasury, 0.25% to creator)
      const totalFees = creatorFees + treasuryFees;
      const expectedCreatorFees = totalFees * 25n / 125n; // 0.25% of total
      const expectedTreasuryFees = totalFees * 100n / 125n; // 1% of total

      expect(creatorFees).to.be.closeTo(expectedCreatorFees, ethers.parseEther("0.01"));
      expect(treasuryFees).to.be.closeTo(expectedTreasuryFees, ethers.parseEther("0.01"));
    });
  });

  describe("📊 Bonding Curve Stress Tests", function () {
    it("Should handle extreme supply values", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Buy very large amount to push supply to high values
      const extremeBuy = ethers.parseEther("1000");
      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: extremeBuy
      });

      const extremeInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Verify bonding curve still works
      expect(extremeInfo.exists).to.be.true;
      expect(extremeInfo.soldSupply).to.be.gt(0);

      // Should still be able to buy (at very high price)
      await rabbitLaunchpad.connect(users[2]).buy(
        tokenSetup.tokenAddress,
        1,
        { value: ethers.parseEther("10") }
      );

      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.soldSupply).to.be.gt(extremeInfo.soldSupply);
    });

    it("Should handle near-zero supply scenarios", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Very small initial buy
      const smallBuy = ethers.parseEther("0.001");
      await rabbitLaunchpad.connect(users[1]).buy(
        tokenSetup.tokenAddress,
        1,
        { value: smallBuy }
      );

      const smallInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Should still work correctly
      expect(smallInfo.exists).to.be.true);
      expect(smallInfo.soldSupply).to.be.gt(0);

      // Second buy at slightly higher price
      await rabbitLaunchpad.connect(users[2]).buy(
        tokenSetup.tokenAddress,
        1,
        { value: ethers.parseEther("0.002") }
      );

      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.soldSupply).to.be.gt(smallInfo.soldSupply);
    });

    it("Should handle price calculation edge cases", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Test various buy amounts
      const testAmounts = [
        ethers.parseEther("0.001"),
        ethers.parseEther("0.01"),
        ethers.parseEther("0.1"),
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100")
      ];

      for (const amount of testAmounts) {
        await rabbitLaunchpad.connect(users[1]).buy(
          tokenSetup.tokenAddress,
          1,
          { value: amount }
        );

        const info = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
        expect(info.exists).to.be.true;
        expect(info.totalBNB).to.be.gte(0);
      }
    });
  });

  describe("🎯 Graduation Stress Tests", function () {
    it("Should handle near-graduation scenarios", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Buy up to near graduation threshold
      const targetBNB = ethers.parseEther("1"); // Close to graduation
      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: targetBNB
      });

      const nearGraduationInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(nearGraduationInfo.exists).to.be.true;
      expect(nearGraduationInfo.graduated).to.be.false;

      // Should still allow small trades before graduation
      await rabbitLaunchpad.connect(users[2]).buy(
        tokenSetup.tokenAddress,
        100,
        { value: ethers.parseEther("0.01") }
      );

      // Try graduation (should fail if below threshold)
      await expect(
        rabbitLaunchpad.connect(owner).graduate(tokenSetup.tokenAddress)
      ).to.be.reverted;
    });

    it("Should handle post-graduation operations", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Buy enough to graduate
      const graduationBNB = ethers.parseEther("10");
      for (let i = 1; i <= 5; i++) {
        await rabbitLaunchpad.connect(users[i]).buy(tokenSetup.tokenAddress, {
          value: graduationBNB / 5n
        });
      }

      // Graduate
      await rabbitLaunchpad.connect(owner).graduate(tokenSetup.tokenAddress);

      // Try to buy after graduation (should fail)
      await expect(
        rabbitLaunchpad.connect(users[6]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "AlreadyGraduated");

      // Try to sell after graduation (should fail)
      const tokenContract = await ethers.getContractAt("RabbitToken", tokenSetup.tokenAddress);
      const balance = await tokenContract.balanceOf(users[1].address);

      await expect(
        rabbitLaunchpad.connect(users[1]).sell(
          tokenSetup.tokenAddress,
          balance,
          0
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "AlreadyGraduated");
    });

    it("Should handle multiple graduations", async function () {
      // Create multiple tokens
      const tokenSetups = [];
      for (let i = 1; i <= 3; i++) {
        const setup = await createTestToken(rabbitLaunchpad, users[i]);
        tokenSetups.push(setup);

        // Buy enough for graduation
        const graduationBNB = ethers.parseEther("2");
        for (let j = 4; j <= 7; j++) {
          await rabbitLaunchpad.connect(users[j]).buy(
            setup.tokenAddress,
            1000,
            { value: graduationBNB / 4n }
          );
        }
      }

      // Graduate all tokens
      for (const setup of tokenSetups) {
        await rabbitLaunchpad.connect(owner).graduate(setup.tokenAddress);
      }

      // Verify all tokens graduated
      for (const setup of tokenSetups) {
        const info = await rabbitLaunchpad.getTokenInfo(setup.tokenAddress);
        expect(info.graduated).to.be.true;
      }
    });
  });

  describe("🔥 System Stability Under Stress", function () {
    it("Should maintain stability during extreme load", async function () {
      const tokenSetups = [];

      // Create multiple tokens
      for (let i = 1; i <= 5; i++) {
        const setup = await createTestToken(rabbitLaunchpad, users[i]);
        tokenSetups.push(setup);
      }

      // Extreme load: many users trading many tokens
      const extremeTransactions = [];
      for (let i = 1; i <= 10; i++) {
        for (let j = 0; j < 5; j++) {
          // Buy from different tokens
          extremeTransactions.push(
            rabbitLaunchpad.connect(users[i]).buy(
              tokenSetups[j].tokenAddress,
              100,
              { value: ethers.parseEther("0.1") }
            )
          );
        }
      }

      // Execute with some tolerance for failures
      const results = await Promise.allSettled(extremeTransactions);

      let successCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount++;
        }
      }

      // Should handle load gracefully (at least 80% success)
      expect(successCount).to.be.gte(extremeTransactions.length * 0.8);

      // Verify system still functional
      for (const setup of tokenSetups) {
        const info = await rabbitLaunchpad.getTokenInfo(setup.tokenAddress);
        expect(info.exists).to.be.true;
      }
    });

    it("Should recover from failed transactions", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Mix of valid and invalid transactions
      const mixedTransactions = [
        // Valid
        rabbitLaunchpad.connect(users[1]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("0.1") }
        ),
        // Invalid (insufficient BNB)
        rabbitLaunchpad.connect(users[2]).buy(
          tokenSetup.tokenAddress,
          1000000,
          { value: ethers.parseEther("0.001") }
        ),
        // Valid
        rabbitLaunchpad.connect(users[3]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("0.1") }
        ),
        // Invalid (zero address)
        rabbitLaunchpad.connect(users[4]).buy(
          ZERO_ADDRESS,
          1000,
          { value: ethers.parseEther("0.1") }
        ),
        // Valid
        rabbitLaunchpad.connect(users[5]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("0.1") }
        )
      ];

      const results = await Promise.allSettled(mixedTransactions);

      // Count successful transactions
      let successCount = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount++;
        }
      }

      // Should have some successful transactions
      expect(successCount).to.be.gte(3);

      // System should still be functional
      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.exists).to.be.true;
      expect(finalInfo.totalBNB).to.be.gt(0);
    });
  });
});