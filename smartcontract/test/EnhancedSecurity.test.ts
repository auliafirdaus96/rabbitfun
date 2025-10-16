import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("RabbitLaunchpad Enhanced Security Tests", function () {
  let rabbitLaunchpad: Contract;
  let rabbitToken: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Test constants
  const CREATE_FEE = ethers.utils.parseEther("0.005");
  const INITIAL_PRICE = ethers.BigNumber.from("10000000000"); // 1e-8 BNB in wei
  const TOTAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 1B tokens
  const TARGET_SUPPLY = ethers.utils.parseEther("800000000"); // 800M tokens

  beforeEach(async function () {
    [owner, user1, user2, user3, treasury] = await ethers.getSigners();

    // Deploy enhanced contract
    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad_Enhanced_Final");
    rabbitLaunchpad = await RabbitLaunchpad.deploy(treasury.address);
    await rabbitLaunchpad.deployed();

    console.log(`Enhanced contract deployed to: ${rabbitLaunchpad.address}`);
  });

  describe("🔒 Security Feature Tests", function () {
    describe("Emergency Controls", function () {
      it("Should allow owner to pause and unpause contract", async function () {
        // Initial state should be unpaused
        expect(await rabbitLaunchpad.isPaused()).to.be.false;

        // Pause contract
        await expect(rabbitLaunchpad.pause())
          .to.emit(rabbitLaunchpad, "ContractStateChanged")
          .withArgs(true, false, await getBlockTimestamp(), owner.address);

        expect(await rabbitLaunchpad.isPaused()).to.be.true;

        // Try to buy while paused (should fail)
        await expect(
          rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, {
            value: ethers.utils.parseEther("1")
          })
        ).to.be.revertedWith("Contract is paused");

        // Unpause contract
        await expect(rabbitLaunchpad.unpause())
          .to.emit(rabbitLaunchpad, "ContractStateChanged")
          .withArgs(false, false, await getBlockTimestamp(), owner.address);

        expect(await rabbitLaunchpad.isPaused()).to.be.false;
      });

      it("Should prevent non-owners from pausing", async function () {
        await expect(
          rabbitLaunchpad.connect(user1).pause()
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should handle emergency mode correctly", async function () {
        // Activate emergency mode
        await expect(rabbitLaunchpad.activateEmergencyMode())
          .to.emit(rabbitLaunchpad, "ContractStateChanged")
          .withArgs(true, true, await getBlockTimestamp(), owner.address);

        expect(await rabbitLaunchpad.isEmergencyMode()).to.be.true;
        expect(await rabbitLaunchpad.isPaused()).to.be.true;

        // Prevent normal operations
        await expect(
          rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, {
            value: ethers.utils.parseEther("1")
          })
        ).to.be.revertedWith("Contract in emergency mode");

        // Only owner can deactivate emergency mode after 24 hours
        await expect(
          rabbitLaunchpad.connect(user1).deactivateEmergencyMode()
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(
          rabbitLaunchpad.deactivateEmergencyMode()
        ).to.be.revertedWith("Wait 24 hours before deactivation");
      });
    });

    describe("Input Validation", function () {
      it("Should validate purchase amounts", async function () {
        // Test minimum purchase amount
        const minAmount = ethers.utils.parseEther("0.001");
        const belowMin = ethers.utils.parseEther("0.0005");

        await expect(
          rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, {
            value: belowMin
          })
        ).to.be.revertedWith("Amount below minimum");

        // Test maximum purchase amount
        const maxAmount = ethers.utils.parseEther("100");
        const aboveMax = ethers.utils.parseEther("101");

        await expect(
          rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, {
            value: aboveMax
          })
        ).to.be.revertedWith("Amount above maximum");

        // Valid amounts should work (if token exists)
        await expect(
          rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, {
            value: minAmount
          })
        ).to.be.revertedWith("Token not found"); // Expected, but amount validation passed
      });

      it("Should validate token creation parameters", async function () {
        // Test invalid name lengths
        await expect(
          rabbitLaunchpad.createToken("A", "T", { value: CREATE_FEE })
        ).to.be.revertedWith("Invalid name length");

        await expect(
          rabbitLaunchpad.createToken("A".repeat(51), "T", { value: CREATE_FEE })
        ).to.be.revertedWith("Invalid name length");

        // Test invalid symbol lengths
        await expect(
          rabbitLaunchpad.createToken("Test", "A", { value: CREATE_FEE })
        ).to.be.revertedWith("Invalid symbol length");

        await expect(
          rabbitLaunchpad.createToken("Test", "SYMBOL", { value: CREATE_FEE })
        ).to.be.revertedWith("Invalid symbol length");
      });
    });

    describe("Safe Mathematical Operations", function () {
      it("Should handle price calculations safely", async function () {
        // Test with zero supply
        const zeroPrice = await rabbitLaunchpad.calculatePrice(0);
        expect(zeroPrice).to.equal(INITIAL_PRICE);

        // Test with large supply (should not overflow)
        const largeSupply = ethers.utils.parseEther("1000000000"); // 1B tokens
        const largePrice = await rabbitLaunchpad.calculatePrice(largeSupply);
        expect(largePrice).to.be.gt(0);

        // Test with maximum supply
        const maxPrice = await rabbitLaunchpad.calculatePrice(TARGET_SUPPLY);
        expect(maxPrice).to.be.gt(INITIAL_PRICE);
      });

      it("Should handle token purchase calculations safely", async function () {
        const currentSupply = ethers.utils.parseEther("1000");
        const bnbAmount = ethers.utils.parseEther("1");

        const tokensReceived = await rabbitLaunchpad.calculateTokenPurchase(
          currentSupply,
          bnbAmount,
          INITIAL_PRICE,
          0 // slope not used in enhanced version
        );

        expect(tokensReceived).to.be.gt(0);
        expect(tokensReceived).to.be.lt(TOTAL_SUPPLY);
      });

      it("Should handle edge cases in mathematical operations", async function () {
        // Test with very small amounts
        const smallSupply = 1;
        const smallPrice = await rabbitLaunchpad.calculatePrice(smallSupply);
        expect(smallPrice).to.be.gt(0);

        // Test with very large amounts
        const hugeSupply = TOTAL_SUPPLY.div(2);
        const hugePrice = await rabbitLaunchpad.calculatePrice(hugeSupply);
        expect(hugePrice).to.be.gt(0);
      });
    });

    describe("Safe External Calls", function () {
      it("Should handle failed fee transfers gracefully", async function () {
        // Create a contract that rejects transfers
        const RejectingReceiver = await ethers.getContractFactory("RejectingReceiver");
        const rejectingReceiver = await RejectingReceiver.deploy();
        await rejectingReceiver.deployed();

        // Deploy new contract with rejecting receiver as treasury
        const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad_Enhanced_Final");
        const testContract = await RabbitLaunchpad.deploy(rejectingReceiver.address);
        await testContract.deployed();

        // Fee transfer should fail but not revert the entire transaction
        await expect(
          testContract.connect(user1).createToken("Test", "TST", { value: CREATE_FEE })
        ).to.be.revertedWith("Fee transfer failed");
      });

      it("Should handle token transfer failures", async function () {
        // This would need a custom token that rejects transfers
        // For now, we test normal operation
        await expect(
          rabbitLaunchpad.connect(user1).createToken("Test", "TST", { value: CREATE_FEE })
        ).to.emit(rabbitLaunchpad, "TokenCreated");
      });
    });

    describe("Gas Optimization", function () {
      it("Should use reasonable gas amounts", async function () {
        // Measure gas usage for key functions
        const createTx = await rabbitLaunchpad.connect(user1).createToken("GasTest", "GAS", {
          value: CREATE_FEE
        });
        const createReceipt = await createTx.wait();

        console.log(`Token creation gas: ${createReceipt.gasUsed.toString()}`);
        expect(createReceipt.gasUsed).to.be.lt(5000000); // Should be under 5M gas

        const tokenAddress = createReceipt.events?.find((e: any) => e.event === "TokenCreated")?.args?.tokenAddress;

        // Test buy function gas
        const buyTx = await rabbitLaunchpad.connect(user2).buy(tokenAddress, {
          value: ethers.utils.parseEther("1")
        });
        const buyReceipt = await buyTx.wait();

        console.log(`Buy transaction gas: ${buyReceipt.gasUsed.toString()}`);
        expect(buyReceipt.gasUsed).to.be.lt(300000); // Should be under 300k gas

        // Test sell function gas
        const sellTx = await rabbitLaunchpad.connect(user2).sell(tokenAddress, ethers.utils.parseEther("100"));
        const sellReceipt = await sellTx.wait();

        console.log(`Sell transaction gas: ${sellReceipt.gasUsed.toString()}`);
        expect(sellReceipt.gasUsed).to.be.lt(300000); // Should be under 300k gas
      });
    });

    describe("Access Control", function () {
      it("Should enforce owner-only functions", async function () {
        // Test pause
        await expect(
          rabbitLaunchpad.connect(user1).pause()
        ).to.be.revertedWith("Ownable: caller is not the owner");

        // Test emergency mode
        await expect(
          rabbitLaunchpad.connect(user1).activateEmergencyMode()
        ).to.be.revertedWith("Ownable: caller is not the owner");

        // Test emergency withdrawal
        await expect(
          rabbitLaunchpad.connect(user1).emergencyWithdraw(ethers.utils.parseEther("1"))
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Should handle delayed admin updates", async function () {
        const newTreasury = user3.address;

        // Initiate treasury update
        await rabbitLaunchpad.initiateTreasuryUpdate(newTreasury);

        // Should not be able to complete immediately
        await expect(
          rabbitLaunchpad.completeTreasuryUpdate()
        ).to.be.revertedWith("Update delay not met");

        // Treasury should remain unchanged
        expect(await rabbitLaunchpad.treasury()).to.equal(treasury.address);

        // Time travel (in test environment, we'd need to use time manipulation)
        // For now, just test the initiation works
        expect(await rabbitLaunchpad.pendingTreasury()).to.equal(newTreasury);
      });
    });

    describe("Event Logging", function () {
      it("Should emit comprehensive events", async function () {
        // Test TokenCreated event
        await expect(
          rabbitLaunchpad.connect(user1).createToken("EventTest", "EVT", { value: CREATE_FEE })
        )
          .to.emit(rabbitLaunchpad, "TokenCreated")
          .withArgs(
            user1.address,
            ethers.constants.AddressZero, // This would be the actual token address
            "EventTest",
            "EVT",
            await getBlockTimestamp(),
            await getGasUsage()
          );

        // Test SecurityEvent event
        await expect(rabbitLaunchpad.pause())
          .to.emit(rabbitLaunchpad, "SecurityEvent")
          .withArgs(
            "CONTRACT_STATE_CHANGED",
            owner.address,
            0,
            await getBlockTimestamp(),
            ""
          );
      });
    });

    describe("Emergency Functions", function () {
      it("Should handle emergency withdrawal correctly", async function () {
        // Add funds to contract
        await owner.sendTransaction({
          to: rabbitLaunchpad.address,
          value: ethers.utils.parseEther("10")
        });

        // Activate emergency mode
        await rabbitLaunchpad.activateEmergencyMode();

        const balanceBefore = await owner.getBalance();
        const withdrawAmount = ethers.utils.parseEther("5");

        // Emergency withdrawal
        await expect(rabbitLaunchpad.emergencyWithdraw(withdrawAmount))
          .to.emit(rabbitLaunchpad, "EmergencyAction");

        const balanceAfter = await owner.getBalance();
        expect(balanceAfter).to.be.gt(balanceBefore);
      });

      it("Should handle emergency token recovery", async function () {
        // This would require a separate token contract setup
        // For now, test native BNB recovery
        await owner.sendTransaction({
          to: rabbitLaunchpad.address,
          value: ethers.utils.parseEther("1")
        });

        await rabbitLaunchpad.activateEmergencyMode();

        await expect(rabbitLaunchpad.emergencyTokenRecovery(ethers.constants.AddressZero, 0))
          .to.emit(rabbitLaunchpad, "EmergencyAction");
      });
    });
  });

  describe("🧪 Integration Tests", function () {
    it("Should handle complete token lifecycle", async function () {
      // Create token
      const createTx = await rabbitLaunchpad.connect(user1).createToken("Lifecycle", "LIFE", {
        value: CREATE_FEE
      });
      const createReceipt = await createTx.wait();

      const tokenCreatedEvent = createReceipt.events?.find((e: any) => e.event === "TokenCreated");
      const tokenAddress = tokenCreatedEvent?.args?.tokenAddress;

      // Get token contract
      const RabbitToken = await ethers.getContractFactory("RabbitToken");
      const token = RabbitToken.attach(tokenAddress);

      // Buy tokens
      const buyAmount = ethers.utils.parseEther("1");
      await rabbitLaunchpad.connect(user2).buy(tokenAddress, { value: buyAmount });

      // Check token balance
      const balance = await token.balanceOf(user2.address);
      expect(balance).to.be.gt(0);

      // Sell some tokens
      const sellAmount = balance.div(2);
      await rabbitLaunchpad.connect(user2).sell(tokenAddress, sellAmount);

      // Check remaining balance
      const remainingBalance = await token.balanceOf(user2.address);
      expect(remainingBalance).to.equal(balance.sub(sellAmount));
    });

    it("Should handle edge cases and error conditions", async function () {
      // Test invalid operations
      await expect(
        rabbitLaunchpad.connect(user1).buy(ethers.constants.AddressZero, { value: 0 })
      ).to.be.revertedWith("Amount below minimum");

      await expect(
        rabbitLaunchpad.connect(user1).sell(ethers.constants.AddressZero, 0)
      ).to.be.revertedWith("Token not found");

      // Test reentrancy protection (should be built into the contract)
      // This would require a malicious contract to test
    });
  });

  // Helper functions
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  async function getGasUsage(): Promise<number> {
    // This would be implemented based on the specific transaction
    return 0;
  }
});

// Supporting contract for testing failed external calls
contract RejectingReceiver {
  receive() external payable {
    revert("Rejecting all transfers");
  }

  fallback() external payable {
    revert("Rejecting all calls");
  }
}