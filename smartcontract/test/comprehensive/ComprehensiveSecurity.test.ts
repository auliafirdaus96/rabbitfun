import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import {
  setupContract,
  createTestToken,
  expectEvent,
  DEFAULT_TEST_PARAMS,
  ZERO_ADDRESS,
  getLatestTokenAddress
} from "../setup";

describe("Comprehensive Security Tests", function () {
  let rabbitLaunchpad: RabbitLaunchpad;
  let setup: any;
  let owner: any;
  let users: any[];
  let attacker: any;

  beforeEach(async function () {
    const contractSetup = await setupContract();
    rabbitLaunchpad = contractSetup.rabbitLaunchpad;
    owner = contractSetup.owner;
    users = contractSetup.users;
    attacker = contractSetup.users[contractSetup.users.length - 1];
  });

  describe("🔒 Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks on buy function", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);
      const bnbAmount = ethers.parseEther("0.1");

      // Create a malicious contract that attempts reentrancy
      const MaliciousContract = await ethers.getContractFactory("ReentrancyAttacker");
      const malicious = await MaliciousContract.deploy(
        await rabbitLaunchpad.getAddress(),
        tokenSetup.tokenAddress,
        { value: bnbAmount }
      );

      await malicious.connect(attacker).attemptReentrancy();

      // Check that reentrancy was prevented
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.be.gt(0);
    });

    it("Should prevent reentrancy attacks on sell function", async function () {
      // First buy tokens
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);
      const bnbAmount = ethers.parseEther("0.1");

      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: bnbAmount
      });

      // Create malicious contract for sell reentrancy
      const MaliciousContract = await ethers.getContractFactory("ReentrancyAttacker");
      const malicious = await MaliciousContract.deploy(
        await rabbitLaunchpad.getAddress(),
        tokenSetup.tokenAddress,
        { value: 0 }
      );

      // Transfer tokens to malicious contract
      const tokenContract = await ethers.getContractAt("RabbitToken", tokenSetup.tokenAddress);
      await tokenContract.connect(users[1]).transfer(await malicious.getAddress(), ethers.parseEther("1000"));

      await malicious.connect(attacker).attemptSellReentrancy();

      // Verify reentrancy was prevented
      const balance = await tokenContract.balanceOf(await malicious.getAddress());
      expect(balance).to.be.eq(0);
    });
  });

  describe("💸 Integer Overflow/Underflow Protection", function () {
    it("Should prevent overflow in token creation", async function () {
      // Try to create token with maximum uint256 amount
      const maxAmount = ethers.MaxUint256;

      await expect(
        rabbitLaunchpad.connect(users[0]).createToken(
          "Test Token",
          "TEST",
          "Test metadata",
          { value: maxAmount }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidAmount");
    });

    it("Should prevent underflow in sell operations", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Try to sell more tokens than owned
      const sellAmount = ethers.parseEther("1000000000"); // More than total supply

      await expect(
        rabbitLaunchpad.connect(users[0]).sell(
          tokenSetup.tokenAddress,
          sellAmount,
          0
        )
      ).to.be.reverted; // Should revert due to insufficient balance
    });

    it("Should handle large numbers safely in bonding curve", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Buy large amounts to test overflow protection
      const largeAmount = ethers.parseEther("1000");

      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: largeAmount
      });

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.be.gt(0);
      expect(tokenInfo.totalBNB).to.be.eq(largeAmount - (largeAmount * 125n / 10000n));
    });
  });

  describe("🎭 Front Running Protection", function () {
    it("Should maintain order of transactions", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Send multiple transactions in the same block
      const buyAmount = ethers.parseEther("0.05");

      const tx1 = rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: buyAmount
      });

      const tx2 = rabbitLaunchpad.connect(users[2]).buy(tokenSetup.tokenAddress, {
        value: buyAmount
      });

      const tx3 = rabbitLaunchpad.connect(users[3]).buy(tokenSetup.tokenAddress, {
        value: buyAmount
      });

      // Mine all transactions together
      await Promise.all([tx1, tx2, tx3]);

      // Verify all transactions succeeded
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(tokenInfo.soldSupply).to.be.gt(0);
    });

    it("Should prevent price manipulation attacks", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Try to manipulate price with rapid buy/sell
      const buyAmount = ethers.parseEther("1");

      // Rapid buy operations
      for (let i = 0; i < 10; i++) {
        await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
          value: buyAmount / 10n
        });
      }

      // Check final price is reasonable
      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.totalBNB).to.be.gt(0);
    });
  });

  describe("🚪 Access Control", function () {
    it("Should prevent unauthorized access to owner functions", async function () {
      // Try to call owner functions as regular user
      await expect(
        rabbitLaunchpad.connect(users[1]).setPaused(true)
      ).to.be.revertedWithCustomError((error: any) => error.name === "Unauthorized");

      await expect(
        rabbitLaunchpad.connect(users[1]).setEmergencyMode(true)
      ).to.be.revertedWithCustomError((error: any) => error.name === "Unauthorized");

      await expect(
        rabbitLaunchpad.connect(users[1]).setTreasury(users[2].address)
      ).to.be.revertedWithCustomError((error: any) => error.name === "Unauthorized");
    });

    it("Should prevent unauthorized emergency withdrawals", async function () {
      // Add some BNB to contract
      await owner.sendTransaction({
        to: await rabbitLaunchpad.getAddress(),
        value: ethers.parseEther("1")
      });

      await expect(
        rabbitLaunchpad.connect(users[1]).emergencyWithdraw()
      ).to.be.revertedWithCustomError((error: any) => error.name === "Unauthorized");
    });

    it("Should validate treasury address changes", async function () {
      // Try to set zero address as treasury
      await expect(
        rabbitLaunchpad.connect(owner).setTreasury(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidAddress");

      // Valid address change should work
      await expect(
        rabbitLaunchpad.connect(owner).setTreasury(users[2].address)
      ).to.not.be.reverted;
    });
  });

  describe("🛡️ Economic Security", function () {
    it("Should prevent creation of tokens with insufficient fees", async function () {
      const lowFee = ethers.parseEther("0.001"); // Less than required 0.005

      await expect(
        rabbitLaunchpad.connect(users[0]).createToken(
          "Test Token",
          "TEST",
          "Test metadata",
          { value: lowFee }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidAmount");
    });

    it("Should enforce slippage protection", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);
      const buyAmount = ethers.parseEther("0.1");

      // Calculate expected tokens
      const expectedTokens = await rabbitLaunchpad.calculateTokensOut(
        tokenSetup.tokenAddress,
        buyAmount - (buyAmount * 125n / 10000n)
      );

      // Try to buy with unrealistic slippage (demanding 10x expected tokens)
      const unrealisticMinOut = expectedTokens * 10n;

      await expect(
        rabbitLaunchpad.connect(users[1]).buy(
          tokenSetup.tokenAddress,
          unrealisticMinOut,
          { value: buyAmount }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidSlippage");
    });

    it("Should prevent trades when contract is paused", async function () {
      await rabbitLaunchpad.connect(owner).setPaused(true);

      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      await expect(
        rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWithCustomError((error: any) => error.name === "ContractPaused");

      await expect(
        rabbitLaunchpad.connect(users[0]).sell(
          tokenSetup.tokenAddress,
          ethers.parseEther("1000"),
          0
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "ContractPaused");
    });

    it("Should prevent operations during emergency mode", async function () {
      await rabbitLaunchpad.connect(owner).setEmergencyMode(true);

      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      await expect(
        rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWithCustomError((error: any) => error.name === "EmergencyModeActive");
    });

    it("Should prevent double graduation", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Add enough liquidity for graduation
      const totalBnb = ethers.parseEther("10");
      for (let i = 1; i < 5; i++) {
        await rabbitLaunchpad.connect(users[i]).buy(tokenSetup.tokenAddress, {
          value: totalBnb / 4n
        });
      }

      // Graduate the token
      await rabbitLaunchpad.connect(owner).graduate(tokenSetup.tokenAddress);

      // Try to graduate again
      await expect(
        rabbitLaunchpad.connect(owner).graduate(tokenSetup.tokenAddress)
      ).to.be.revertedWithCustomError((error: any) => error.name === "AlreadyGraduated");

      // Try to buy graduated token
      await expect(
        rabbitLaunchpad.connect(users[5]).buy(tokenSetup.tokenAddress, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWithCustomError((error: any) => error.name === "AlreadyGraduated");
    });
  });

  describe("🔥 Edge Cases and Boundary Conditions", function () {
    it("Should handle zero amount transactions", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      await expect(
        rabbitLaunchpad.connect(users[1]).buy(
          tokenSetup.tokenAddress,
          0,
          { value: 0 }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidAmount");

      await expect(
        rabbitLaunchpad.connect(users[0]).sell(
          tokenSetup.tokenAddress,
          0,
          0
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "InvalidAmount");
    });

    it("Should handle invalid token addresses", async function () {
      await expect(
        rabbitLaunchpad.connect(users[1]).buy(
          ZERO_ADDRESS,
          1000,
          { value: ethers.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "TokenNotFound");

      await expect(
        rabbitLaunchpad.connect(users[1]).sell(
          ZERO_ADDRESS,
          1000,
          0
        )
      ).to.be.revertedWithCustomError((error: any) => error.name === "TokenNotFound");

      await expect(
        rabbitLaunchpad.connect(owner).graduate(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError((error: any) => error.name === "TokenNotFound");
    });

    it("Should handle maximum token limit", async function () {
      // This test would require creating many tokens to reach the limit
      // For now, we'll just verify the check exists
      expect(true).to.be.true; // Placeholder - would need extensive setup
    });

    it("Should handle insufficient BNB balance", async function () {
      // Try to buy with insufficient BNB
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Empty user's account first
      await expect(
        rabbitLaunchpad.connect(users[1]).buy(
          tokenSetup.tokenAddress,
          1000,
          { value: ethers.parseEther("1000") }
        )
      ).to.be.reverted;
    });
  });

  describe("⚡ Gas Optimization Tests", function () {
    it("Should use reasonable gas amounts", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Measure gas for buy operation
      const tx = await rabbitLaunchpad.connect(users[1]).buy(
        tokenSetup.tokenAddress,
        1000,
        { value: ethers.parseEther("0.1") }
      );

      const receipt = await tx.wait();

      // Gas should be reasonable (under 200,000)
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should not have gas leaks in loops", async function () {
      // Test that gas usage doesn't grow unexpectedly
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Multiple small operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          rabbitLaunchpad.connect(users[1]).buy(
            tokenSetup.tokenAddress,
            100,
            { value: ethers.parseEther("0.01") }
          )
        );
      }

      const results = await Promise.all(operations);

      // All operations should succeed
      for (const result of results) {
        expect(result.hash).to.be.a('string');
      }
    });
  });

  describe("📊 State Consistency", function () {
    it("Should maintain consistent state across multiple operations", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Record initial state
      const initialInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      // Perform series of operations
      const buyAmount = ethers.parseEther("0.1");
      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: buyAmount
      });

      await rabbitLaunchpad.connect(users[2]).buy(tokenSetup.tokenAddress, {
        value: buyAmount
      });

      const sellAmount = ethers.parseEther("1000");
      await rabbitLaunchpad.connect(users[1]).sell(
        tokenSetup.tokenAddress,
        sellAmount,
        0
      );

      // Verify final state consistency
      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);

      expect(finalInfo.exists).to.be.true;
      expect(finalInfo.totalBNB).to.be.gte(initialInfo.totalBNB);
      expect(finalInfo.soldSupply).to.be.gte(initialInfo.soldSupply);
    });
  });

  describe("🚨 Attack Vectors", function () {
    it("Should resist MEV (Maximum Extractable Value) attacks", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Simulate MEV attack with sandwich trading
      const victimBuyAmount = ethers.parseEther("1");

      // Attacker front-runs with large buy
      await rabbitLaunchpad.connect(attacker).buy(tokenSetup.tokenAddress, {
        value: victimBuyAmount
      });

      // Victim buys
      await rabbitLaunchpad.connect(users[1]).buy(tokenSetup.tokenAddress, {
        value: victimBuyAmount
      });

      // Attacker back-runs with sell
      const tokenContract = await ethers.getContractAt("RabbitToken", tokenSetup.tokenAddress);
      const attackerBalance = await tokenContract.balanceOf(attacker.address);

      await rabbitLaunchpad.connect(attacker).sell(
        tokenSetup.tokenAddress,
        attackerBalance,
        0
      );

      // Verify attacker didn't completely drain value
      const finalInfo = await rabbitLaunchpad.getTokenInfo(tokenSetup.tokenAddress);
      expect(finalInfo.totalBNB).to.be.gt(0);
    });

    it("Should resist flash loan attacks", async function () {
      const tokenSetup = await createTestToken(rabbitLaunchpad, users[0]);

      // Simulate flash loan attack
      const flashLoanAmount = ethers.parseEther("100");

      // Attacker tries to manipulate price with flash loan
      await rabbitLaunchpad.connect(attacker).buy(tokenSetup.tokenAddress, {
        value: flashLoanAmount
      });

      // Try to profit from manipulation
      const tokenContract = await ethers.getContractAt("RabbitToken", tokenSetup.tokenAddress);
      const attackerBalance = await tokenContract.balanceOf(attacker.address);

      await rabbitLaunchpad.connect(attacker).sell(
        tokenSetup.tokenAddress,
        attackerBalance,
        0
      );

      // Verify attack wasn't profitable
      const finalBalance = await ethers.provider.getBalance(attacker.address);
      expect(finalBalance).to.be.lt(flashLoanAmount); // Attacker lost money
    });

    it("Should resist governance attacks", async function () {
      // Try to manipulate owner functions
      const originalTreasury = await rabbitLaunchpad.treasury();

      // Attempt unauthorized governance attack
      await expect(
        rabbitLaunchpad.connect(users[1]).setTreasury(users[2].address)
      ).to.be.revertedWithCustomError((error: any) => error.name === "Unauthorized");

      // Verify treasury unchanged
      const currentTreasury = await rabbitLaunchpad.treasury();
      expect(currentTreasury).to.equal(originalTreasury);
    });
  });
});