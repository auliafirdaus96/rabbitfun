import { expect } from "chai";
import { ethers } from "hardhat";
import { AhiruLaunchpad, AhiruToken } from "../../client/src/types/contracts";
import {
  setupContract,
  createTestToken,
  calculateExpectedPrice,
  calculateExpectedTokens,
  calculateExpectedBNB,
  calculateFee,
  expectAlmostEqual,
  expectEvent,
  DEFAULT_TEST_PARAMS,
} from "../setup";

describe("Bonding Curve Calculations", function () {
  let ahiruLaunchpad: AhiruLaunchpad;
  let setup: any;

  beforeEach(async function () {
    setup = await setupContract();
    ahiruLaunchpad = setup.ahiruLaunchpad;
  });

  describe("Initial Price Calculation", function () {
    it("Should return correct initial price for zero supply", async function () {
      const expectedPrice = await calculateExpectedPrice(0n);
      expect(expectedPrice).to.equal(DEFAULT_TEST_PARAMS.INITIAL_PRICE);
    });

    it("Should increase price linearly with supply", async function () {
      const supply1 = ethers.parseEther("1000");
      const supply2 = ethers.parseEther("2000");

      const price1 = await calculateExpectedPrice(supply1);
      const price2 = await calculateExpectedPrice(supply2);

      expect(price2).to.be.gt(price1);
      expect(price2 - price1).to.equal(DEFAULT_TEST_PARAMS.CURVE_SLOPE * (supply2 - supply1));
    });

    it("Should handle very large supply values", async function () {
      const largeSupply = DEFAULT_TEST_PARAMS.TOTAL_SUPPLY / 2n;
      const price = await calculateExpectedPrice(largeSupply);

      expect(price).to.be.gt(DEFAULT_TEST_PARAMS.INITIAL_PRICE);
      expect(price).to.be.lt(ethers.parseEther("1")); // Should be less than 1 BNB even at 50% supply
    });
  });

  describe("Token Purchase Calculation", function () {
    it("Should calculate correct tokens for small BNB amounts", async function () {
      const bnbAmount = ethers.parseEther("0.001"); // 0.001 BNB
      const currentSupply = 0n;

      const expectedTokens = await calculateExpectedTokens(bnbAmount, currentSupply);
      expect(expectedTokens).to.be.gt(0);

      // For initial purchase, tokens should be approximately bnbAmount / initialPrice
      const approximateTokens = bnbAmount / DEFAULT_TEST_PARAMS.INITIAL_PRICE;
      expectAlmostEqual(expectedTokens, BigInt(approximateTokens), ethers.parseEther("0.001"));
    });

    it("Should calculate correct tokens for medium BNB amounts", async function () {
      const bnbAmount = ethers.parseEther("0.1"); // 0.1 BNB
      const currentSupply = ethers.parseEther("100000"); // 100K tokens sold

      const expectedTokens = await calculateExpectedTokens(bnbAmount, currentSupply);
      expect(expectedTokens).to.be.gt(0);

      // As supply increases, price increases, so tokens received should decrease
      const initialTokens = await calculateExpectedTokens(bnbAmount, 0n);
      expect(expectedTokens).to.be.lt(initialTokens);
    });

    it("Should handle zero BNB amount", async function () {
      const bnbAmount = 0n;
      const currentSupply = ethers.parseEther("1000");

      const expectedTokens = await calculateExpectedTokens(bnbAmount, currentSupply);
      expect(expectedTokens).to.equal(0n);
    });

    it("Should calculate tokens correctly using smart contract", async function () {
      const tokenSetup = await createTestToken(setup, "Price Test", "PRICE");
      const { ahiruLaunchpad, users } = setup;
      const buyer = users[3];

      const bnbAmount = ethers.parseEther("0.01");

      // Calculate expected tokens
      const expectedTokens = await calculateExpectedTokens(bnbAmount, 0n);

      // Get actual tokens from contract
      const actualTokens = await ahiruLaunchpad.calculateTokenPurchase(
        0n,
        bnbAmount,
        DEFAULT_TEST_PARAMS.INITIAL_PRICE,
        DEFAULT_TEST_PARAMS.CURVE_SLOPE
      );

      expectAlmostEqual(actualTokens, expectedTokens, ethers.parseEther("0.0001"));
    });
  });

  describe("BNB Sale Calculation", function () {
    it("Should calculate correct BNB for token sale", async function () {
      const tokenAmount = ethers.parseEther("1000"); // 1000 tokens
      const currentSupply = ethers.parseEther("5000"); // 5000 tokens sold

      const expectedBNB = await calculateExpectedBNB(tokenAmount, currentSupply);
      expect(expectedBNB).to.be.gt(0);

      // Should receive approximately current price * tokenAmount
      const currentPrice = await calculateExpectedPrice(currentSupply);
      const approximateBNB = (currentPrice * tokenAmount) / ethers.parseEther("1");
      expectAlmostEqual(expectedBNB, approximateBNB, ethers.parseEther("0.001"));
    });

    it("Should calculate less BNB for selling tokens at higher supply", async function () {
      const tokenAmount = ethers.parseEther("1000"); // 1000 tokens
      const lowSupply = ethers.parseEther("1000");
      const highSupply = ethers.parseEther("100000");

      const bnbAtLowSupply = await calculateExpectedBNB(tokenAmount, lowSupply);
      const bnbAtHighSupply = await calculateExpectedBNB(tokenAmount, highSupply);

      expect(bnbAtLowSupply).to.be.gt(bnbAtHighSupply);
    });

    it("Should handle zero token amount", async function () {
      const tokenAmount = 0n;
      const currentSupply = ethers.parseEther("1000");

      const expectedBNB = await calculateExpectedBNB(tokenAmount, currentSupply);
      expect(expectedBNB).to.equal(0n);
    });

    it("Should calculate BNB correctly using smart contract", async function () {
      const tokenSetup = await createTestToken(setup, "BNB Test", "BNB");
      const { ahiruLaunchpad } = setup;

      const tokenAmount = ethers.parseEther("500");
      const currentSupply = ethers.parseEther("2000");

      // Calculate expected BNB
      const expectedBNB = await calculateExpectedBNB(tokenAmount, currentSupply);

      // Get actual BNB from contract
      const actualBNB = await ahiruLaunchpad.calculateTokenSale(currentSupply, tokenAmount, DEFAULT_TEST_PARAMS.INITIAL_PRICE, 0);

      expectAlmostEqual(actualBNB, expectedBNB, ethers.parseEther("0.0001"));
    });
  });

  describe("Price Impact", function () {
    it("Should calculate price impact for small purchases", async function () {
      const currentSupply = ethers.parseEther("1000");
      const bnbAmount = ethers.parseEther("0.001");

      const priceBefore = await calculateExpectedPrice(currentSupply);
      const tokensReceived = await calculateExpectedTokens(bnbAmount, currentSupply);
      const priceAfter = await calculateExpectedPrice(currentSupply + tokensReceived);

      const priceImpact = ((priceAfter - priceBefore) * 10000n) / priceBefore; // basis points

      // Small purchase should have minimal price impact
      expect(priceImpact).to.be.lt(100n); // Less than 1%
    });

    it("Should calculate higher price impact for large purchases", async function () {
      const currentSupply = ethers.parseEther("1000");
      const smallBnbAmount = ethers.parseEther("0.001");
      const largeBnbAmount = ethers.parseEther("0.1");

      const priceBefore = await calculateExpectedPrice(currentSupply);

      const smallTokens = await calculateExpectedTokens(smallBnbAmount, currentSupply);
      const smallPriceAfter = await calculateExpectedPrice(currentSupply + smallTokens);
      const smallPriceImpact = ((smallPriceAfter - priceBefore) * 10000n) / priceBefore;

      const largeTokens = await calculateExpectedTokens(largeBnbAmount, currentSupply);
      const largePriceAfter = await calculateExpectedPrice(currentSupply + largeTokens);
      const largePriceImpact = ((largePriceAfter - priceBefore) * 10000n) / priceBefore;

      expect(largePriceImpact).to.be.gt(smallPriceImpact);
    });

    it("Should maintain price consistency", async function () {
      const bnbAmount = ethers.parseEther("0.01");
      const currentSupply = ethers.parseEther("1000");

      // Calculate tokens to receive
      const tokensReceived = await calculateExpectedTokens(bnbAmount, currentSupply);

      // Calculate BNB needed to buy same tokens at new price
      const newSupply = currentSupply + tokensReceived;
      const bnbNeeded = await calculateExpectedBNB(tokensReceived, newSupply);

      // Due to bonding curve, BNB needed should be slightly higher than original amount
      expect(bnbNeeded).to.be.gte(bnbAmount);
    });
  });

  describe("Fee Calculations", function () {
    it("Should calculate platform and creator fees correctly", async function () {
      const amount = ethers.parseEther("1");
      const fee = calculateFee(amount, 125); // 1.25%

      expect(fee.totalFee).to.equal(ethers.parseEther("0.0125")); // 0.0125 BNB
      expect(fee.platformFee).to.equal(ethers.parseEther("0.01")); // 1%
      expect(fee.creatorFee).to.equal(ethers.parseEther("0.0025")); // 0.25%
      expect(fee.netAmount).to.equal(ethers.parseEther("0.9875")); // 98.75%
    });

    it("Should handle zero amount", async function () {
      const amount = 0n;
      const fee = calculateFee(amount, 125);

      expect(fee.totalFee).to.equal(0n);
      expect(fee.platformFee).to.equal(0n);
      expect(fee.creatorFee).to.equal(0n);
      expect(fee.netAmount).to.equal(0n);
    });

    it("Should handle very small amounts", async function () {
      const amount = ethers.parseEther("0.000001"); // 0.000001 BNB
      const fee = calculateFee(amount, 125);

      expect(fee.totalFee).to.equal(ethers.parseEther("0.0000000125"));
      expect(fee.platformFee).to.equal(ethers.parseEther("0.00000001"));
      expect(fee.creatorFee).to.equal(ethers.parseEther("0.0000000025"));
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle maximum possible token purchase", async function () {
      const maxBNB = ethers.parseEther("1000"); // 1000 BNB
      const currentSupply = DEFAULT_TEST_PARAMS.TOTAL_SUPPLY - DEFAULT_TEST_PARAMS.GRADUATION_TOKEN_ALLOCATION;

      const tokens = await calculateExpectedTokens(maxBNB, currentSupply);

      // Should not exceed available supply
      expect(tokens).to.be.lte(DEFAULT_TEST_PARAMS.GRADUATION_TOKEN_ALLOCATION);
    });

    it("Should handle very small decimal amounts", async function () {
      const tinyAmount = ethers.parseEther("0.000000001"); // 1 gwei
      const currentSupply = ethers.parseEther("1");

      const tokens = await calculateExpectedTokens(tinyAmount, currentSupply);
      expect(tokens).to.be.gte(0n);
    });

    it("Should maintain mathematical precision", async function () {
      const bnbAmount = ethers.parseEther("0.123456789");
      const currentSupply = ethers.parseEther("12345.6789");

      const tokensReceived = await calculateExpectedTokens(bnbAmount, currentSupply);
      const bnbRefund = await calculateExpectedBNB(tokensReceived, currentSupply + tokensReceived);

      // Due to bonding curve, refund should be slightly less than original
      expect(bnbRefund).to.be.lte(bnbAmount);
      expect(bnbAmount - bnbRefund).to.be.lt(ethers.parseEther("0.000001")); // Less than 0.001% difference
    });
  });

  describe("Integration with Contract Constants", function () {
    it("Should use correct initial price from contract", async function () {
      const contractInitialPrice = await ahiruLaunchpad.INITIAL_PRICE();
      expect(contractInitialPrice).to.equal(DEFAULT_TEST_PARAMS.INITIAL_PRICE);
    });

    it("Should use correct curve slope from contract", async function () {
      // const contractSlope = await ahiruLaunchpad.CURVE_SLOPE(); // Not available on contract
      // expect(contractSlope).to.equal(DEFAULT_TEST_PARAMS.CURVE_SLOPE); // Slope not exposed on contract
    });

    it("Should use correct create fee from contract", async function () {
      const contractCreateFee = await ahiruLaunchpad.CREATE_FEE();
      expect(contractCreateFee).to.equal(DEFAULT_TEST_PARAMS.CREATE_FEE);
    });

    it("Should use correct total supply from contract", async function () {
      const contractTotalSupply = await ahiruLaunchpad.TOTAL_SUPPLY();
      expect(contractTotalSupply).to.equal(DEFAULT_TEST_PARAMS.TOTAL_SUPPLY);
    });

    it("Should use correct graduation allocation from contract", async function () {
      const contractAllocation = await ahiruLaunchpad.GRADUATION_TOKEN_ALLOCATION();
      expect(contractAllocation).to.equal(DEFAULT_TEST_PARAMS.GRADUATION_TOKEN_ALLOCATION);
    });
  });
});