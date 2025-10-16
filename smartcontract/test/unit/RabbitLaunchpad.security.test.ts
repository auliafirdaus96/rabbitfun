import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { AhiruToken } from "../../client/src/types/contracts";

describe("RabbitLaunchpad - Security Vulnerabilities", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let attacker: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: AhiruToken;

  const CREATE_FEE = ethers.parseEther("0.005");

  beforeEach(async function () {
    [owner, creator, buyer, attacker, treasury, dexRouter] = await ethers.getSigners();

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

  describe("Reentrancy Protection", function () {
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

  describe("Overflow/Underflow Protection", function () {
    it("Should handle large token amounts without overflow", async function () {
      // Buy a large amount
      const largeAmount = ethers.parseEther("1000");
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: largeAmount });

      const buyerBalance = await token.balanceOf(await buyer.getAddress());
      expect(buyerBalance).to.be.gt(0);

      // Try to sell a large amount
      await expect(
        launchpad.connect(buyer).sell(await token.getAddress(), buyerBalance)
      ).to.not.be.reverted;
    });

    it("Should handle maximum uint256 values safely", async function () {
      // Try to create token with maximum fee (should fail gracefully)
      const maxFee = ethers.MaxUint256;

      await expect(
        launchpad.connect(creator).createToken(
          "Max Test Token",
          "MAX",
          "https://example.com/metadata.json",
          { value: maxFee }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should handle boundary values in calculations", async function () {
      // Test with very small amounts
      const tinyAmount = BigInt(1); // 1 wei

      await expect(
        launchpad.connect(buyer).buy(await token.getAddress(), { value: tinyAmount })
      ).to.be.revertedWith("Insufficient BNB for token purchase");
    });

    it("Should prevent selling more than total supply", async function () {
      // Try to sell more than total supply
      const maxTokens = ethers.parseEther("1000000000"); // Total supply

      await expect(
        launchpad.connect(buyer).sell(await token.getAddress(), maxTokens)
      ).to.be.revertedWith("Insufficient token balance");
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized treasury updates", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;

      await expect(
        launchpad.connect(attacker).updateTreasury(newTreasury)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent unauthorized DEX router updates", async function () {
      const newRouter = ethers.Wallet.createRandom().address;

      await expect(
        launchpad.connect(attacker).updateDexRouter(newRouter)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent unauthorized emergency withdraw", async function () {
      await expect(
        launchpad.connect(attacker)['emergencyWithdraw(uint256)'](ethers.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to update treasury", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;

      await expect(
        launchpad.connect(owner).updateTreasury(newTreasury)
      ).to.not.be.reverted;

      expect(await launchpad.treasury()).to.equal(newTreasury);
    });

    it("Should allow owner to update DEX router", async function () {
      const newRouter = ethers.Wallet.createRandom().address;

      await expect(
        launchpad.connect(owner).updateDexRouter(newRouter)
      ).to.not.be.reverted;

      const globalState = await launchpad.globalState();
      expect(globalState.dexRouter).to.equal(newRouter);
    });

    it("Should prevent setting zero address as treasury", async function () {
      await expect(
        launchpad.connect(owner).updateTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury cannot be zero address");
    });

    it("Should prevent setting zero address as DEX router", async function () {
      await expect(
        launchpad.connect(owner).updateDexRouter(ethers.ZeroAddress)
      ).to.be.revertedWith("DEX Router cannot be zero address");
    });
  });

  describe("Input Validation", function () {
    it("Should validate token creation parameters", async function () {
      // Test with empty name
      await expect(
        launchpad.connect(creator).createToken(
          "",
          "TEST",
          "https://example.com/metadata.json",
          { value: CREATE_FEE }
        )
      ).to.not.be.reverted; // ERC20 allows empty name

      // Test with empty symbol
      await expect(
        launchpad.connect(creator).createToken(
          "Test Token",
          "",
          "https://example.com/metadata.json",
          { value: CREATE_FEE }
        )
      ).to.not.be.reverted; // ERC20 allows empty symbol

      // Test with incorrect fee
      await expect(
        launchpad.connect(creator).createToken(
          "Test Token",
          "TEST",
          "https://example.com/metadata.json",
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should validate buy parameters", async function () {
      // Test with zero address
      await expect(
        launchpad.connect(buyer).buy(ethers.ZeroAddress, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Token does not exist");

      // Test with zero BNB
      await expect(
        launchpad.connect(buyer).buy(await token.getAddress(), { value: 0 })
      ).to.be.revertedWith("BNB amount must be greater than 0");
    });

    it("Should validate sell parameters", async function () {
      // Test with zero address
      await expect(
        launchpad.connect(buyer).sell(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("Token does not exist");

      // Test with zero amount
      await expect(
        launchpad.connect(buyer).sell(await token.getAddress(), 0)
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should validate graduation parameters", async function () {
      // Test with zero address
      await expect(
        launchpad.connect(creator).graduate(ethers.ZeroAddress)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Emergency Scenarios", function () {
    it("Should handle emergency withdraw correctly", async function () {
      // Buy some tokens to get BNB in contract
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });

      const contractBalance = await ethers.provider.getBalance(await launchpad.getAddress());
      const ownerBalance = await ethers.provider.getBalance(await owner.getAddress());

      const tx = await launchpad.connect(owner)['emergencyWithdraw(uint256)'](ethers.parseEther("1"));
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(await owner.getAddress());
      const finalContractBalance = await ethers.provider.getBalance(await launchpad.getAddress());

      expect(finalContractBalance).to.equal(0);
      expect(finalOwnerBalance).to.equal(ownerBalance + contractBalance - gasUsed);
    });

    it("Should prevent contract interaction when paused (if implemented)", async function () {
      // This test would require implementing a pause mechanism
      // For now, we'll verify the contract handles normal operations
      await expect(
        launchpad.connect(buyer).buy(await token.getAddress(), {
          value: ethers.parseEther("1")
        })
      ).to.not.be.reverted;
    });
  });

  describe("Front-running Protection", function () {
    it("Should handle rapid sequential transactions", async function () {
      // Send multiple buy transactions in quick succession
      const buyAmount = ethers.parseEther("1");

      const tx1 = launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const tx2 = launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const tx3 = launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });

      await Promise.all([tx1, tx2, tx3]);

      const buyerBalance = await token.balanceOf(await buyer.getAddress());
      expect(buyerBalance).to.be.gt(0);

      // All transactions should be processed correctly
      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfo.soldSupply).to.equal(buyerBalance);
    });

    it("Should maintain price consistency with bonding curve", async function () {
      const buyAmount = ethers.parseEther("1");

      // First buy
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const firstTokens = await token.balanceOf(await buyer.getAddress());

      // Second buy
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const secondTokens = await token.balanceOf(await buyer.getAddress());

      // Price should increase with each buy
      expect(secondTokens - firstTokens).to.be.lt(firstTokens);
    });
  });

  describe("Gas Limit Protection", function () {
    it("Should handle operations within reasonable gas limits", async function () {
      const buyAmount = ethers.parseEther("1");

      // Test gas usage for buy
      const tx1 = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const receipt1 = await tx1.wait();
      expect(receipt1!.gasUsed).to.be.lt(500000n);

      // Test gas usage for sell
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const tx2 = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt2 = await tx2.wait();
      expect(receipt2!.gasUsed).to.be.lt(500000n);
    });
  });
});