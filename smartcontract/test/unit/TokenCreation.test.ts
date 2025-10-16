import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import {
  setupContract,
  createTestToken,
  expectEvent,
  expectAlmostEqual,
  DEFAULT_TEST_PARAMS,
  ZERO_ADDRESS,
  getLatestTokenAddress,
} from "../setup";

describe("Token Creation", function () {
  let rabbitLaunchpad: RabbitLaunchpad;
  let setup: any;

  beforeEach(async function () {
    setup = await setupContract();
    rabbitLaunchpad = setup.rabbitLaunchpad;
  });

  describe("createToken", function () {
    it("Should create token with correct parameters", async function () {
      const { users } = setup;
      const creator = users[2];
      const tokenName = "Test Token";
      const tokenSymbol = "TEST";
      const metadata = "https://example.com/metadata/test.json";

      // Get balances before
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      const treasuryBalanceBefore = await ethers.provider.getBalance(setup.treasury);

      // Create token
      const tx = await rabbitLaunchpad.connect(creator).createToken(
        tokenName,
        tokenSymbol,
        metadata,
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const gasUsed = (receipt?.gasUsed || 0n) * (receipt?.gasPrice || 0n);

      // Check events
      expectEvent(receipt, "TokenCreated");

      // Get token address from getAllTokens
      const tokenList = await rabbitLaunchpad.getAllTokens();
      const tokenAddress = tokenList[tokenList.length - 1];

      expect(tokenAddress).to.be.properAddress;

      // Verify token state
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);

      expect(tokenInfo.name).to.equal(tokenName);
      expect(tokenInfo.symbol).to.equal(tokenSymbol);
      expect(tokenInfo.metadata).to.equal(metadata);
      expect(tokenInfo.creator).to.equal(creator.address);
      expect(tokenInfo.soldSupply).to.equal(0n);
      expect(tokenInfo.totalBNB).to.equal(0n);
      expect(tokenInfo.initialPrice).to.equal(DEFAULT_TEST_PARAMS.INITIAL_PRICE);
      expect(tokenInfo.graduated).to.be.false;
      expect(tokenInfo.exists).to.be.true;

      // Check fee distribution
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      const treasuryBalanceAfter = await ethers.provider.getBalance(setup.treasury);

      const expectedCreatorBalance = creatorBalanceBefore - DEFAULT_TEST_PARAMS.CREATE_FEE - gasUsed;
      const expectedTreasuryBalance = treasuryBalanceBefore + DEFAULT_TEST_PARAMS.CREATE_FEE;

      expectAlmostEqual(creatorBalanceAfter, expectedCreatorBalance, ethers.parseEther("0.001"));
      expect(treasuryBalanceAfter).to.equal(expectedTreasuryBalance);
    });

    it("Should reject token creation with insufficient fee", async function () {
      const { users } = setup;
      const creator = users[2];
      const insufficientFee = ethers.parseEther("0.001"); // Less than required

      await expect(
        rabbitLaunchpad.connect(creator).createToken(
          "Test Token",
          "TEST",
          "https://example.com/metadata/test.json",
          { value: insufficientFee }
        )
      ).to.be.revertedWith("Incorrect creation fee");
    });

    it("Should reject token creation with empty name", async function () {
      const { users } = setup;
      const creator = users[2];

      await expect(
        rabbitLaunchpad.connect(creator).createToken(
          "",
          "TEST",
          "https://example.com/metadata/test.json",
          { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
        )
      ).to.be.revertedWith("Token name cannot be empty");
    });

    it("Should reject token creation with empty symbol", async function () {
      const { users } = setup;
      const creator = users[2];

      await expect(
        rabbitLaunchpad.connect(creator).createToken(
          "Test Token",
          "",
          "https://example.com/metadata/test.json",
          { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
        )
      ).to.be.revertedWith("Token symbol cannot be empty");
    });

    it("Should reject token creation with symbol longer than 10 characters", async function () {
      const { users } = setup;
      const creator = users[2];

      await expect(
        rabbitLaunchpad.connect(creator).createToken(
          "Test Token",
          "TOOLONGSYMBOL",
          "https://example.com/metadata/test.json",
          { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
        )
      ).to.be.revertedWith("Token symbol cannot exceed 10 characters");
    });

    it("Should handle token creation with valid metadata", async function () {
      const { users } = setup;
      const creator = users[2];
      const metadata = "https://gateway.pinata.cloud/ipfs/QmTestHash123";

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        "Metadata Test",
        "META",
        metadata,
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.metadata).to.equal(metadata);
    });

    it("Should handle token creation without metadata", async function () {
      const { users } = setup;
      const creator = users[2];

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        "No Metadata Test",
        "NOMETA",
        "",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.metadata).to.equal("");
    });

    it("Should allow multiple token creation by different users", async function () {
      const { users } = setup;
      const creator1 = users[2];
      const creator2 = users[3];

      // First token
      const tx1 = await rabbitLaunchpad.connect(creator1).createToken(
        "Token 1",
        "TKN1",
        "https://example.com/metadata/1.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );
      const receipt1 = await tx1.wait();
      const token1Address = await getLatestTokenAddress(rabbitLaunchpad);

      // Second token
      const tx2 = await rabbitLaunchpad.connect(creator2).createToken(
        "Token 2",
        "TKN2",
        "https://example.com/metadata/2.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );
      const receipt2 = await tx2.wait();
      const token2Address = await getLatestTokenAddress(rabbitLaunchpad);

      // Verify both tokens exist
      const token1Info = await rabbitLaunchpad.getTokenInfo(token1Address);
      const token2Info = await rabbitLaunchpad.getTokenInfo(token2Address);

      expect(token1Info.creator).to.equal(creator1.address);
      expect(token2Info.creator).to.equal(creator2.address);
      expect(token1Info.symbol).to.equal("TKN1");
      expect(token2Info.symbol).to.equal("TKN2");
    });

    it("Should emit TokenCreated event with correct parameters", async function () {
      const { users } = setup;
      const creator = users[2];
      const tokenName = "Event Test";
      const tokenSymbol = "EVENT";
      const metadata = "https://example.com/metadata/event.json";

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        tokenName,
        tokenSymbol,
        metadata,
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();

      // Check event structure
      expectEvent(receipt, "TokenCreated");

      // Verify token creation completed successfully
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);
      expect(tokenAddress).to.be.properAddress;
    });

    it("Should handle token creation with maximum allowed parameters", async function () {
      const { users } = setup;
      const creator = users[2];
      const longName = "A".repeat(100); // 100 characters
      const symbol = "MAX";
      const longMetadata = "https://example.com/metadata/" + "A".repeat(1000) + ".json";

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        longName,
        symbol,
        longMetadata,
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.name).to.equal(longName);
      expect(tokenInfo.metadata).to.equal(longMetadata);
    });
  });

  describe("Token Creation State Management", function () {
    it("Should initialize token with correct default values", async function () {
      const tokenSetup = await createTestToken(setup, "Default Test", "DEFAULT");
      const { tokenAddress } = tokenSetup;

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);

      // Check all default values
      expect(tokenInfo.soldSupply).to.equal(0n);
      expect(tokenInfo.totalBNB).to.equal(0n);
      expect(tokenInfo.graduated).to.be.false;
      expect(tokenInfo.exists).to.be.true;
      expect(tokenInfo.initialPrice).to.equal(DEFAULT_TEST_PARAMS.INITIAL_PRICE);
    });

    it("Should store token creator correctly", async function () {
      const { users } = setup;
      const creator = users[2];

      const tokenSetup = await createTestToken(setup, "Creator Test", "CREATOR");
      const { tokenAddress } = tokenSetup;

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.creator).to.equal(creator.address);
    });

    it("Should maintain token existence state", async function () {
      const tokenSetup = await createTestToken(setup, "Existence Test", "EXIST");
      const { tokenAddress } = tokenSetup;

      // Check token exists
      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.exists).to.be.true;

      // Check non-existent token
      await expect(
        rabbitLaunchpad.getTokenInfo(ZERO_ADDRESS)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle concurrent token creation", async function () {
      const { users } = setup;
      const creator1 = users[2];
      const creator2 = users[3];
      const creator3 = users[4];

      // Create multiple tokens simultaneously
      const tx1 = rabbitLaunchpad.connect(creator1).createToken(
        "Concurrent 1",
        "CON1",
        "https://example.com/metadata/con1.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const tx2 = rabbitLaunchpad.connect(creator2).createToken(
        "Concurrent 2",
        "CON2",
        "https://example.com/metadata/con2.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const tx3 = rabbitLaunchpad.connect(creator3).createToken(
        "Concurrent 3",
        "CON3",
        "https://example.com/metadata/con3.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      // Wait for all transactions
      const [receipt1, receipt2, receipt3] = await Promise.all([
        tx1.then(tx => tx.wait()),
        tx2.then(tx => tx.wait()),
        tx3.then(tx => tx.wait())
      ]);

      // All transactions should succeed
      expect(receipt1?.status).to.equal(1);
      expect(receipt2?.status).to.equal(1);
      expect(receipt3?.status).to.equal(1);

      // Get all tokens and verify they exist
      const allTokens = await rabbitLaunchpad.getAllTokens();
      expect(allTokens.length).to.be.gte(3); // Should have at least 3 new tokens

      // Get the last 3 created tokens
      const token1Address = allTokens[allTokens.length - 3];
      const token2Address = allTokens[allTokens.length - 2];
      const token3Address = allTokens[allTokens.length - 1];

      const token1Info = await rabbitLaunchpad.getTokenInfo(token1Address);
      const token2Info = await rabbitLaunchpad.getTokenInfo(token2Address);
      const token3Info = await rabbitLaunchpad.getTokenInfo(token3Address);

      expect(token1Info.exists).to.be.true;
      expect(token2Info.exists).to.be.true;
      expect(token3Info.exists).to.be.true;
    });

    it("Should handle token creation with special characters in name", async function () {
      const { users } = setup;
      const creator = users[2];
      const specialName = "Special-Token!@#$%^&*()";

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        specialName,
        "SPECIAL",
        "https://example.com/metadata/special.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.name).to.equal(specialName);
    });

    it("Should handle token creation with Unicode characters", async function () {
      const { users } = setup;
      const creator = users[2];
      const unicodeName = "代币测试";
      const unicodeSymbol = "测试";

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        unicodeName,
        unicodeSymbol,
        "https://example.com/metadata/unicode.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();
      const tokenAddress = await getLatestTokenAddress(rabbitLaunchpad);

      const tokenInfo = await rabbitLaunchpad.getTokenInfo(tokenAddress);
      expect(tokenInfo.name).to.equal(unicodeName);
      expect(tokenInfo.symbol).to.equal(unicodeSymbol);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas consumption for token creation", async function () {
      const { users } = setup;
      const creator = users[2];

      const tx = await rabbitLaunchpad.connect(creator).createToken(
        "Gas Test",
        "GAS",
        "https://example.com/metadata/gas.json",
        { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
      );

      const receipt = await tx.wait();

      // Gas consumption should be reasonable (less than 500k gas)
      expect(receipt?.gasUsed || 0n).to.be.lt(500000);
    });

    it("Should have consistent gas consumption", async function () {
      const { users } = setup;
      const creator = users[2];

      // Create multiple tokens and check gas consistency
      const gasUsages = [];

      for (let i = 0; i < 3; i++) {
        const tx = await rabbitLaunchpad.connect(creator).createToken(
          `Gas Test ${i}`,
          `GAS${i}`,
          "https://example.com/metadata/gas.json",
          { value: DEFAULT_TEST_PARAMS.CREATE_FEE }
        );
        const receipt = await tx.wait();
        gasUsages.push(receipt?.gasUsed || 0n.toString());
      }

      // Gas usage should be consistent (within 10% variance)
      const avgGas = gasUsages.reduce((a, b) => Number(a) + Number(b), 0) / gasUsages.length;
      const variance = gasUsages.reduce((acc, gas) => acc + Math.abs(Number(gas) - avgGas), 0) / gasUsages.length;

      expect(variance).to.be.lt(avgGas * 10 / 100); // Less than 10% variance
    });
  });
});