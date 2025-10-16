import { expect } from "chai";
import { ethers } from "hardhat";
import { RabbitLaunchpad } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Updated Pricing Configuration", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Constants from the updated contract
  const INITIAL_PRICE = ethers.parseEther("0.00001"); // 0.00001 BNB
  const GROSS_RAISE_TARGET = ethers.parseEther("350000"); // 350,000 BNB
  const CREATE_FEE = ethers.parseEther("0.005"); // 0.005 BNB

  beforeEach(async function () {
    [owner, creator, buyer, treasury] = await ethers.getSigners();

    const RabbitLaunchpad = await ethers.getContractFactory("RabbitLaunchpad");

    // Mock PancakeSwap Router address for BSC
    const mockRouter = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

    launchpad = await RabbitLaunchpad.deploy(treasury.address, mockRouter);
    await launchpad.deployed();
  });

  describe("Updated Initial Price Configuration", function () {
    it("Should have correct initial price of 0.00001 BNB", async function () {
      const initialPrice = await launchpad.INITIAL_PRICE();
      expect(initialPrice).to.equal(INITIAL_PRICE);

      // Verify it's 0.00001 BNB
      expect(initialPrice).to.equal(ethers.parseEther("0.00001"));
    });

    it("Should have correct gross raise target of 350,000 BNB", async function () {
      const grossRaiseTarget = await launchpad.GROSS_RAISE_TARGET();
      expect(grossRaiseTarget).to.equal(GROSS_RAISE_TARGET);

      // Verify it's 350,000 BNB
      expect(grossRaiseTarget).to.equal(ethers.parseEther("350000"));
    });

    it("Should calculate price correctly for zero supply", async function () {
      const price = await launchpad.calculatePrice(0);
      expect(price).to.equal(INITIAL_PRICE);
    });
  });

  describe("Updated Token Purchase Calculations", function () {
    let tokenAddress: string;

    beforeEach(async function () {
      // Create a test token
      await launchpad.connect(creator).createToken(
        "Test Token",
        "TEST",
        "https://example.com/metadata.json",
        { value: CREATE_FEE }
      );

      const tokenInfo = await launchpad.getTokenInfo(await launchpad.globalState()).then(state => state.tokenList[0]);
      tokenAddress = tokenInfo;
    });

    it("Should calculate correct token amount for 1 BNB purchase", async function () {
      const bnbAmount = ethers.parseEther("1");
      const tokenAmount = await launchpad.calculateTokenPurchase(0, bnbAmount, INITIAL_PRICE, 0);

      // With price 0.00001 BNB, 1 BNB should get 100,000 tokens
      const expectedTokens = ethers.parseEther("100000");
      expect(tokenAmount).to.be.closeTo(expectedTokens, ethers.parseEther("1"));
    });

    it("Should calculate correct token amount for 0.1 BNB purchase", async function () {
      const bnbAmount = ethers.parseEther("0.1");
      const tokenAmount = await launchpad.calculateTokenPurchase(0, bnbAmount, INITIAL_PRICE, 0);

      // With price 0.00001 BNB, 0.1 BNB should get 10,000 tokens
      const expectedTokens = ethers.parseEther("10000");
      expect(tokenAmount).to.be.closeTo(expectedTokens, ethers.parseEther("0.1"));
    });

    it("Should handle small purchases correctly", async function () {
      const bnbAmount = ethers.parseEther("0.001"); // 0.001 BNB
      const tokenAmount = await launchpad.calculateTokenPurchase(0, bnbAmount, INITIAL_PRICE, 0);

      // With price 0.00001 BNB, 0.001 BNB should get 100 tokens
      const expectedTokens = ethers.parseEther("100");
      expect(tokenAmount).to.be.closeTo(expectedTokens, ethers.parseEther("0.001"));
    });
  });

  describe("Updated Market Cap Calculations", function () {
    let tokenAddress: string;

    beforeEach(async function () {
      await launchpad.connect(creator).createToken(
        "Test Token",
        "TEST",
        "https://example.com/metadata.json",
        { value: CREATE_FEE }
      );

      const tokens = await launchpad.getAllTokens();
      tokenAddress = tokens[0];
    });

    it("Should calculate initial market cap correctly", async function () {
      // Simulate selling some tokens
      const soldSupply = ethers.parseEther("1000000"); // 1M tokens sold
      const currentPrice = await launchpad.calculatePrice(soldSupply);

      // Market cap = price * supply
      const expectedMarketCap = currentPrice * soldSupply / ethers.parseEther("1");

      const stats = await launchpad.getBondingCurveStats(tokenAddress);
      expect(stats.marketCap).to.be.closeTo(expectedMarketCap, ethers.parseEther("1"));
    });

    it("Should show reasonable initial market cap", async function () {
      // With 1M tokens sold at ~0.00001 BNB, market cap should be ~10 BNB
      const soldSupply = ethers.parseEther("1000000");
      const stats = await launchpad.getBondingCurveStats(tokenAddress);

      // Market cap should be reasonable (not too small, not too large)
      expect(stats.marketCap).to.be.gt(ethers.parseEther("5")); // > 5 BNB
      expect(stats.marketCap).to.be.lt(ethers.parseEther("100")); // < 100 BNB
    });
  });

  describe("Updated Graduation Progress", function () {
    let tokenAddress: string;

    beforeEach(async function () {
      await launchpad.connect(creator).createToken(
        "Test Token",
        "TEST",
        "https://example.com/metadata.json",
        { value: CREATE_FEE }
      );

      const tokens = await launchpad.getAllTokens();
      tokenAddress = tokens[0];
    });

    it("Should calculate progress correctly with new target", async function () {
      // Simulate raising 35,000 BNB (10% of new target)
      const raisedAmount = ethers.parseEther("35000");
      const expectedProgress = 1000; // 10% in basis points

      // We need to actually buy tokens to set the totalBNB
      await launchpad.connect(buyer).buy(tokenAddress, {
        value: raisedAmount
      });

      const stats = await launchpad.getBondingCurveStats(tokenAddress);
      expect(stats.progress).to.be.closeTo(expectedProgress, 50); // Allow small variance
    });

    it("Should require much more BNB for graduation with new target", async function () {
      // Check that graduation requires 350,000 BNB gross
      const grossTarget = await launchpad.GROSS_RAISE_TARGET();
      expect(grossTarget).to.equal(ethers.parseEther("350000"));

      // Net target should be 345,625 BNB (after 1.25% fees)
      const netTarget = await launchpad.NET_RAISE_TARGET();
      expect(netTarget).to.equal(ethers.parseEther("345625"));
    });
  });

  describe("Price Appreciation with New Configuration", function () {
    it("Should show reasonable price growth", async function () {
      // Calculate price at different supply levels
      const supply1 = ethers.parseEther("100000000"); // 100M tokens
      const supply2 = ethers.parseEther("400000000"); // 400M tokens

      const price1 = await launchpad.calculatePrice(supply1);
      const price2 = await launchpad.calculatePrice(supply2);

      // Price should increase with supply
      expect(price2).to.be.gt(price1);

      // Growth should be significant but reasonable (not 1000x for 4x supply)
      const growthRatio = Number(price2) / Number(price1);
      expect(growthRatio).to.be.gt(1);
      expect(growthRatio).to.be.lt(100); // Less than 100x growth
    });
  });

  describe("Economic Viability", function () {
    it("Should create sustainable token economics", async function () {
      const initialPrice = await launchpad.INITIAL_PRICE();
      const grossTarget = await launchpad.GROSS_RAISE_TARGET();

      // Initial market cap with 1B tokens at initial price
      const initialMarketCap = initialPrice * ethers.parseEther("1000000000") / ethers.parseEther("1");

      // Should be reasonable for BSC ecosystem
      expect(initialMarketCap).to.equal(ethers.parseEther("10000")); // 10,000 BNB

      // Graduation target should be achievable but challenging
      expect(grossTarget).to.equal(ethers.parseEther("350000")); // 350,000 BNB

      // Growth potential: 35x from initial to graduation
      const growthPotential = Number(grossTarget) / Number(initialMarketCap);
      expect(growthPotential).to.equal(35);
    });
  });
});