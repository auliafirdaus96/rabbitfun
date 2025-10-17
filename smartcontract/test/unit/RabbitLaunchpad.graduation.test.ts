import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { RabbitToken } from "../../client/src/types/contracts";

describe("RabbitLaunchpad - Graduation Functionality", function () {
  const anyValue: any = "any";
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: RabbitToken;

  const CREATE_FEE = ethers.parseEther("0.005");
  const GRADUATION_THRESHOLD = ethers.parseEther("1"); // 1 BNB
  const GRADUATION_TOKEN_ALLOCATION = ethers.parseEther("200000000"); // 200M tokens

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

  describe("Basic Graduation Functionality", function () {
    it("Should allow graduation when threshold is met", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.emit(launchpad, "TokenGraduated")
        .withArgs(
          await token.getAddress(),
          await treasury.getAddress(),
          GRADUATION_THRESHOLD,
          GRADUATION_TOKEN_ALLOCATION,
          anyValue // timestamp
        );
    });

    it("Should mark token as graduated", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      await launchpad.connect(creator).graduate(await token.getAddress());

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfo.graduated).to.be.true;
    });

    it("Should transfer graduation tokens to treasury", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const initialTreasuryTokenBalance = await token.balanceOf(await treasury.getAddress());

      await launchpad.connect(creator).graduate(await token.getAddress());

      const finalTreasuryTokenBalance = await token.balanceOf(await treasury.getAddress());
      expect(finalTreasuryTokenBalance).to.equal(
        initialTreasuryTokenBalance + GRADUATION_TOKEN_ALLOCATION
      );
    });

    it("Should transfer graduation BNB to treasury", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const initialTreasuryBNBBalance = await ethers.provider.getBalance(await treasury.getAddress());

      await launchpad.connect(creator).graduate(await token.getAddress());

      const finalTreasuryBNBBalance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(finalTreasuryBNBBalance).to.be.gt(initialTreasuryBNBBalance);
    });
  });

  describe("Graduation Edge Cases", function () {
    it("Should revert when graduating non-existent token", async function () {
      const randomAddress = ethers.Wallet.createRandom().address;

      await expect(
        launchpad.connect(creator).graduate(randomAddress)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should revert when graduating already graduated token", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // First graduation
      await launchpad.connect(creator).graduate(await token.getAddress());

      // Try to graduate again
      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should revert when graduation threshold is not met", async function () {
      // Buy less than graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("0.5") // Less than 1 BNB
      });

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.be.revertedWith("Insufficient BNB for graduation");
    });

    it("Should allow graduation exactly at threshold", async function () {
      // Buy exactly the graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });

    it("Should handle graduation with large amounts", async function () {
      // Buy much more than graduation threshold
      const largeAmount = ethers.parseEther("10");
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: largeAmount
      });

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.not.be.reverted;

      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
      expect(tokenInfo.graduated).to.be.true;
    });

    it("Should prevent buying after graduation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // Graduate the token
      await launchpad.connect(creator).graduate(await token.getAddress());

      // Try to buy after graduation
      await expect(
        launchpad.connect(buyer).buy(await token.getAddress(), {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("Token already graduated");
    });

    it("Should prevent selling after graduation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // Graduate the token
      await launchpad.connect(creator).graduate(await token.getAddress());

      // Try to sell after graduation
      const buyerBalance = await token.balanceOf(await buyer.getAddress());

      await expect(
        launchpad.connect(buyer).sell(await token.getAddress(), buyerBalance)
      ).to.be.revertedWith("Token already graduated");
    });
  });

  describe("Graduation Permissions", function () {
    it("Should allow creator to graduate", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });

    it("Should allow owner to graduate", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      await expect(
        launchpad.connect(owner).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });

    it("Should allow any user to graduate", async function () {
      // Create another user
      const [, , , , , , randomUser] = await ethers.getSigners();

      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // Any user should be able to graduate (public function)
      await expect(
        launchpad.connect(randomUser).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });
  });

  describe("Graduation State Changes", function () {
    it("Should preserve token information after graduation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const tokenInfoBefore = await launchpad.getTokenInfo(await token.getAddress());

      await launchpad.connect(creator).graduate(await token.getAddress());

      const tokenInfoAfter = await launchpad.getTokenInfo(await token.getAddress());

      expect(tokenInfoAfter.tokenAddress).to.equal(tokenInfoBefore.tokenAddress);
      expect(tokenInfoAfter.name).to.equal(tokenInfoBefore.name);
      expect(tokenInfoAfter.symbol).to.equal(tokenInfoBefore.symbol);
      expect(tokenInfoAfter.creator).to.equal(tokenInfoBefore.creator);
      expect(tokenInfoAfter.soldSupply).to.equal(tokenInfoBefore.soldSupply);
      expect(tokenInfoAfter.totalBNB).to.equal(tokenInfoBefore.totalBNB);
      expect(tokenInfoAfter.initialPrice).to.equal(tokenInfoBefore.initialPrice);
      // Slope property doesn't exist in TokenState, removing this check
      expect(tokenInfoAfter.graduated).to.be.true;
      expect(tokenInfoAfter.exists).to.be.true;
    });

    it("Should keep token in token list after graduation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const tokenListBefore = await launchpad.getAllTokens();

      await launchpad.connect(creator).graduate(await token.getAddress());

      const tokenListAfter = await launchpad.getAllTokens();
      expect(tokenListAfter.length).to.equal(tokenListBefore.length);
      expect(tokenListAfter[0]).to.equal(tokenListBefore[0]);
    });

    it("Should maintain correct totalTokensCreated count after graduation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const globalStateBefore = await launchpad.globalState();

      await launchpad.connect(creator).graduate(await token.getAddress());

      const globalStateAfter = await launchpad.globalState();
      expect(globalStateAfter.totalTokensCreated).to.equal(globalStateBefore.totalTokensCreated);
    });
  });

  describe("Liquidity Pool Simulation", function () {
    it("Should handle the LP transfer simulation correctly", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      const contractBNBBefore = await ethers.provider.getBalance(await launchpad.getAddress());
      const contractTokensBefore = await token.balanceOf(await launchpad.getAddress());

      await launchpad.connect(creator).graduate(await token.getAddress());

      const contractBNBAfter = await ethers.provider.getBalance(await launchpad.getAddress());
      const contractTokensAfter = await token.balanceOf(await launchpad.getAddress());

      // Contract should have less BNB and tokens after graduation (transferred to treasury)
      expect(contractBNBAfter).to.be.lt(contractBNBBefore);
      expect(contractTokensAfter).to.be.lt(contractTokensBefore);
    });

    it("Should ensure sufficient tokens for LP allocation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // Contract should have enough tokens for LP allocation
      const contractTokens = await token.balanceOf(await launchpad.getAddress());
      expect(contractTokens).to.be.gte(GRADUATION_TOKEN_ALLOCATION);

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });

    it("Should ensure sufficient BNB for LP allocation", async function () {
      // Buy enough to meet graduation threshold
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: GRADUATION_THRESHOLD
      });

      // Contract should have enough BNB for LP allocation
      const contractBNB = await ethers.provider.getBalance(await launchpad.getAddress());
      expect(contractBNB).to.be.gte(GRADUATION_THRESHOLD);

      await expect(
        launchpad.connect(creator).graduate(await token.getAddress())
      ).to.not.be.reverted;
    });
  });
});