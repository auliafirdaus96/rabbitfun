import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";

describe("Simple Security Validation Tests", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;

  const CREATE_FEE = ethers.parseEther("0.005");

  beforeEach(async function () {
    [owner, creator, buyer, treasury, dexRouter] = await ethers.getSigners();

    const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
    launchpad = await Launchpad.deploy(
      await treasury.getAddress(),
      await dexRouter.getAddress()
    );
    await launchpad.waitForDeployment();
  });

  describe("⚡ Integer Overflow Protection", function () {
    it("Should reject excessive BNB amounts in calculateTokenPurchase", async function () {
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
      const maxSupply = ethers.parseEther("800000000"); // 800M tokens

      const price = await launchpad.calculatePrice(maxSupply);
      expect(price).to.be.gt(0);
    });
  });

  describe("⚡ Timelock Protection", function () {
    it("Should not allow immediate treasury update completion", async function () {
      const newTreasury = await dexRouter.getAddress();

      await launchpad.connect(owner).initiateTreasuryUpdate(newTreasury);

      await expect(
        launchpad.connect(owner).completeTreasuryUpdate()
      ).to.be.revertedWith("Timelock not expired");

      const pendingTreasury = await launchpad.pendingTreasury();
      expect(pendingTreasury).to.equal(newTreasury);
    });

    it("Should reject duplicate treasury updates", async function () {
      const newTreasury = await dexRouter.getAddress();

      await launchpad.connect(owner).initiateTreasuryUpdate(newTreasury);

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

      await expect(
        launchpad.connect(owner)["emergencyWithdraw(uint256)"](excessiveAmount)
      ).to.be.revertedWith("Amount exceeds maximum emergency limit");
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
        launchpad.connect(owner).updateTreasury(await dexRouter.getAddress())
      ).to.be.revertedWith("Use initiateTreasuryUpdate and completeTreasuryUpdate with timelock");
    });

    it("Should reject legacy emergencyWithdraw function", async function () {
      await expect(
        launchpad.connect(owner)["emergencyWithdraw()"]()
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

    it("Should reject buy operations for non-existent tokens", async function () {
      await expect(
        launchpad.connect(buyer).buy(ethers.Wallet.createRandom().address, {
          value: ethers.parseEther("0.1")
        })
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should reject operations with zero BNB", async function () {
      await launchpad.connect(creator).createToken(
        "Test Token",
        "TEST",
        "https://example.com/metadata.json",
        { value: CREATE_FEE }
      );

      const allTokens = await launchpad.getAllTokens();
      const tokenAddress = allTokens[0];

      await expect(
        launchpad.connect(buyer).buy(tokenAddress, {
          value: 0
        })
      ).to.be.revertedWith("BNB amount must be greater than 0");
    });
  });

  describe("⚡ Constants Validation", function () {
    it("Should have correct constants set", async function () {
      expect(await launchpad.CREATE_FEE()).to.equal(CREATE_FEE);
      expect(await launchpad.INITIAL_PRICE()).to.equal(10 * 10**9);
      expect(await launchpad.TOTAL_SUPPLY()).to.equal(1000000000n * 10n**18n);
      expect(await launchpad.TARGET_SUPPLY()).to.equal(800000000n * 10n**18n);
    });

    it("Should have correct timelock constants", async function () {
      const timelockDelay = await launchpad.TIMELOCK_DELAY();
      const emergencyTimelock = await launchpad.EMERGENCY_TIMELOCK();
      const maxEmergencyWithdraw = await launchpad.MAX_EMERGENCY_WITHDRAW();

      expect(timelockDelay).to.equal(7 * 24 * 60 * 60); // 7 days
      expect(emergencyTimelock).to.equal(24 * 60 * 60); // 24 hours
      expect(maxEmergencyWithdraw).to.equal(ethers.parseEther("10")); // 10 BNB
    });
  });

  describe("⚡ Access Control", function () {
    it("Should only allow owner to initiate treasury update", async function () {
      await expect(
        launchpad.connect(buyer).initiateTreasuryUpdate(await buyer.getAddress())
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow owner to emergency withdraw", async function () {
      await expect(
        launchpad.connect(buyer)["emergencyWithdraw(uint256)"](ethers.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});