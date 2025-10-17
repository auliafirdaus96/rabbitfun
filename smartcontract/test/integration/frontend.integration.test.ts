import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";
import { RabbitLaunchpad } from "../../client/src/types/contracts";
import { RabbitToken } from "../../client/src/types/contracts";

describe("Frontend Integration Tests", function () {
  let launchpad: RabbitLaunchpad;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dexRouter: SignerWithAddress;
  let token: RabbitToken;

  const CREATE_FEE = ethers.parseEther("0.005");

  beforeEach(async function () {
    [owner, creator, buyer, treasury, dexRouter] = await ethers.getSigners();

    const Launchpad = await ethers.getContractFactory("RabbitLaunchpad");
    launchpad = await Launchpad.deploy(
      await treasury.getAddress(),
      await dexRouter.getAddress()
    );
    await launchpad.waitForDeployment();

    // Create a token for testing
    const tx = await launchpad.connect(creator).createToken(
      "Test Token",
      "TEST",
      "https://example.com/metadata.json",
      { value: CREATE_FEE }
    );

    // Get token address from the event
    const receipt = await tx.wait();
    const event = receipt!.logs[0];
    const parsedEvent = launchpad.interface.parseLog(event as any);

    if (!parsedEvent) {
      throw new Error("Failed to parse TokenCreated event");
    }

    const tokenAddress = parsedEvent.args.tokenAddress;
    token = await ethers.getContractAt("RabbitToken", tokenAddress);
  });

  describe("Token Creation Flow", function () {
    it("Should simulate frontend token creation process", async function () {
      // Simulate frontend form data
      const tokenData = {
        name: "Frontend Token",
        symbol: "FRONT",
        metadata: "https://gateway.pinata.cloud/ipfs/QmExample123",
        creatorFee: CREATE_FEE
      };

      // Simulate frontend transaction
      const tx = await launchpad.connect(creator).createToken(
        tokenData.name,
        tokenData.symbol,
        tokenData.metadata,
        { value: tokenData.creatorFee }
      );

      const receipt = await tx.wait();

      // Verify transaction details for frontend display
      expect(receipt!.logs).to.have.length(1); // TokenCreated event

      // Extract event data for frontend
      const event = receipt!.logs[0];
      const parsedEvent = launchpad.interface.parseLog(event as any);

      if (!parsedEvent) {
        throw new Error("Failed to parse TokenCreated event");
      }

      expect(parsedEvent.name).to.equal("TokenCreated");
      expect(parsedEvent.args.name).to.equal(tokenData.name);
      expect(parsedEvent.args.symbol).to.equal(tokenData.symbol);
      expect(parsedEvent.args.creator).to.equal(await creator.getAddress());

      // Return data structure for frontend
      const frontendData = {
        transactionHash: tx.hash,
        blockNumber: receipt!.blockNumber,
        gasUsed: receipt!.gasUsed.toString(),
        tokenAddress: parsedEvent.args.tokenAddress,
        name: parsedEvent.args.name,
        symbol: parsedEvent.args.symbol,
        creator: parsedEvent.args.creator,
        timestamp: parsedEvent.args.timestamp.toString()
      };

      expect(frontendData.tokenAddress).to.be.a('string');
      expect(frontendData.tokenAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it("Should handle token creation with different metadata formats", async function () {
      const metadataFormats = [
        "https://api.example.com/metadata/123",
        "ipfs://QmExample123456789",
        "https://gateway.pinata.cloud/ipfs/QmHash",
        "data:application/json;base64,eyJuYW1lIjoiRXhhbXBsZSJ9"
      ];

      const results = [];

      for (const metadata of metadataFormats) {
        const tx = await launchpad.connect(creator).createToken(
          `Token ${results.length}`,
          `TK${results.length}`,
          metadata,
          { value: CREATE_FEE }
        );

        const receipt = await tx.wait();
        const event = receipt!.logs[0];
        const parsedEvent = launchpad.interface.parseLog(event as any);

        if (!parsedEvent) {
          throw new Error("Failed to parse TokenCreated event");
        }

        results.push({
          tokenAddress: parsedEvent.args.tokenAddress,
          metadata: metadata,
          success: true
        });
      }

      expect(results).to.have.length(metadataFormats.length);
      results.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.tokenAddress).to.be.a('string');
      });
    });
  });

  describe("Token Purchase Flow", function () {
    it("Should simulate frontend buy transaction flow", async function () {
      const buyAmount = ethers.parseEther("1"); // 1 BNB

      // Get token info for frontend display
      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());

      // Calculate expected tokens for frontend preview
      const totalFee = buyAmount * 125n / 10000n; // 1.25%
      const bnbForTokens = buyAmount - totalFee;
      // Get contract constants for calculation
      const initialPrice = await launchpad.INITIAL_PRICE();
      const kFactor = await launchpad.K_FACTOR();

      const expectedTokens = await launchpad.calculateTokenPurchase(
        tokenInfo.soldSupply,
        bnbForTokens,
        initialPrice,
        kFactor
      );

      // Simulate frontend transaction
      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: buyAmount });
      const receipt = await tx.wait();

      // Extract transaction data for frontend
      const events = receipt!.logs.filter(log => {
        try {
          const parsedLog = launchpad.interface.parseLog(log as any);
          return parsedLog?.name === "TokenBought";
        } catch {
          return false;
        }
      });

      expect(events).to.have.length(1);
      const buyEvent = launchpad.interface.parseLog(events[0] as any);

      if (!buyEvent) {
        throw new Error("Failed to parse TokenBought event");
      }

      // Frontend data structure
      const frontendData = {
        transactionHash: tx.hash,
        blockNumber: receipt!.blockNumber,
        gasUsed: receipt!.gasUsed.toString(),
        tokenAddress: buyEvent.args.tokenAddress,
        buyer: buyEvent.args.buyer,
        bnbAmount: buyEvent.args.bnbAmount.toString(),
        tokenAmount: buyEvent.args.tokenAmount.toString(),
        timestamp: buyEvent.args.timestamp.toString(),
        fees: {
          platform: (buyAmount * 100n / 10000n).toString(),
          creator: (buyAmount * 25n / 10000n).toString(),
          total: totalFee.toString()
        },
        pricePerToken: (bnbForTokens * 10n**18n / expectedTokens).toString()
      };

      expect(frontendData.tokenAmount).to.equal(expectedTokens.toString());
      expect(frontendData.buyer).to.equal(await buyer.getAddress());
    });

    it("Should handle multiple purchase simulation for frontend", async function () {
      const purchases = [
        { amount: ethers.parseEther("0.1"), expectedSuccess: true },
        { amount: ethers.parseEther("0.5"), expectedSuccess: true },
        { amount: ethers.parseEther("1"), expectedSuccess: true },
        { amount: ethers.parseEther("5"), expectedSuccess: true }
      ];

      const results = [];

      for (const purchase of purchases) {
        try {
          const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: purchase.amount });
          const receipt = await tx.wait();

          const events = receipt!.logs.filter(log => {
            try {
              const parsedLog = launchpad.interface.parseLog(log as any);
              return parsedLog?.name === "TokenBought";
            } catch {
              return false;
            }
          });

          if (events.length > 0) {
            const buyEvent = launchpad.interface.parseLog(events[0] as any);

            if (!buyEvent) {
              throw new Error("Failed to parse TokenBought event");
            }

            results.push({
              amount: purchase.amount.toString(),
              success: true,
              tokensReceived: buyEvent.args.tokenAmount.toString(),
              gasUsed: receipt!.gasUsed.toString(),
              transactionHash: tx.hash
            });
          } else {
            results.push({
              amount: purchase.amount.toString(),
              success: false,
              error: "No TokenBought event found"
            });
          }
        } catch (error) {
          results.push({
            amount: purchase.amount.toString(),
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      expect(results.filter(r => r.success)).to.have.length(purchases.length);
    });

    it("Should simulate price calculation for frontend preview", async function () {
      const buyAmounts = [0.1, 0.5, 1, 2, 5]; // In BNB

      const priceCalculations = [];

      for (const amount of buyAmounts) {
        const buyAmountWei = ethers.parseEther(amount.toString());
        const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());

        const totalFee = buyAmountWei * 125n / 10000n;
        const bnbForTokens = buyAmountWei - totalFee;
        // Get contract constants for calculation
        const initialPrice = await launchpad.INITIAL_PRICE();
        const kFactor = await launchpad.K_FACTOR();

        const expectedTokens = await launchpad.calculateTokenPurchase(
          tokenInfo.soldSupply,
          bnbForTokens,
          initialPrice,
          kFactor
        );

        priceCalculations.push({
          bnbAmount: amount.toString(),
          bnbAmountWei: buyAmountWei.toString(),
          totalFee: totalFee.toString(),
          bnbForTokens: bnbForTokens.toString(),
          expectedTokens: expectedTokens.toString(),
          pricePerToken: (bnbForTokens * 10n**18n / expectedTokens).toString()
        });
      }

      // Verify price increases with bonding curve
      for (let i = 1; i < priceCalculations.length; i++) {
        const currentPrice = BigInt(priceCalculations[i].pricePerToken);
        const previousPrice = BigInt(priceCalculations[i - 1].pricePerToken);
        expect(currentPrice >= previousPrice).to.be.true;
      }
    });
  });

  describe("Token Sale Flow", function () {
    beforeEach(async function () {
      // Buy tokens for selling tests
      await launchpad.connect(buyer).buy(await token.getAddress(), {
        value: ethers.parseEther("10")
      });
    });

    it("Should simulate frontend sell transaction flow", async function () {
      const sellAmount = await token.balanceOf(await buyer.getAddress());
      const sellAmountStr = ethers.formatEther(sellAmount);

      // Get current token info for frontend display
      const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());

      // Get contract constants for calculation
      const initialPrice = await launchpad.INITIAL_PRICE();
      const kFactor = await launchpad.K_FACTOR();

      // Calculate expected BNB for frontend preview
      const expectedBNB = await launchpad.calculateTokenSale(
        tokenInfo.soldSupply,
        sellAmount,
        initialPrice,
        kFactor
      );

      const totalFee = expectedBNB * 125n / 10000n;
      const bnbToUser = expectedBNB - totalFee;

      // Simulate frontend transaction
      const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
      const receipt = await tx.wait();

      // Extract transaction data for frontend
      const events = receipt!.logs.filter(log => {
        try {
          const parsedLog = launchpad.interface.parseLog(log as any);
          return parsedLog?.name === "TokenSold";
        } catch {
          return false;
        }
      });

      expect(events).to.have.length(1);
      const sellEvent = launchpad.interface.parseLog(events[0] as any);

      if (!sellEvent) {
        throw new Error("Failed to parse TokenSold event");
      }

      // Frontend data structure
      const frontendData = {
        transactionHash: tx.hash,
        blockNumber: receipt!.blockNumber,
        gasUsed: receipt!.gasUsed.toString(),
        tokenAddress: sellEvent.args.tokenAddress,
        seller: sellEvent.args.seller,
        tokenAmount: sellEvent.args.tokenAmount.toString(),
        bnbAmount: sellEvent.args.bnbAmount.toString(),
        timestamp: sellEvent.args.timestamp.toString(),
        fees: {
          platform: (expectedBNB * 100n / 10000n).toString(),
          creator: (expectedBNB * 25n / 10000n).toString(),
          total: totalFee.toString()
        },
        pricePerToken: (bnbToUser * 10n**18n / sellAmount).toString()
      };

      expect(frontendData.tokenAmount).to.equal(sellAmount.toString());
      expect(frontendData.seller).to.equal(await buyer.getAddress());
      expect(frontendData.bnbAmount).to.equal(bnbToUser.toString());
    });

    it("Should simulate partial sell for frontend", async function () {
      const totalTokens = await token.balanceOf(await buyer.getAddress());
      const sellFractions = [0.25, 0.5, 0.75];

      const results = [];

      for (const fraction of sellFractions) {
        const sellAmount = totalTokens * BigInt(Math.floor(fraction * 100)) / 100n;
        const sellAmountStr = ethers.formatEther(sellAmount);

        const tx = await launchpad.connect(buyer).sell(await token.getAddress(), sellAmount);
        const receipt = await tx.wait();

        const events = receipt!.logs.filter(log => {
          try {
            const parsedLog = launchpad.interface.parseLog(log as any);
            return parsedLog?.name === "TokenSold";
          } catch {
            return false;
          }
        });

        if (events.length > 0) {
          const sellEvent = launchpad.interface.parseLog(events[0] as any);

          if (!sellEvent) {
            throw new Error("Failed to parse TokenSold event");
          }

          results.push({
            fraction: fraction,
            tokensSold: sellEvent.args.tokenAmount.toString(),
            bnbReceived: sellEvent.args.bnbAmount.toString(),
            gasUsed: receipt!.gasUsed.toString(),
            transactionHash: tx.hash
          });
        }
      }

      expect(results).to.have.length(sellFractions.length);
      results.forEach(result => {
        expect(parseFloat(result.tokensSold)).to.be.gt(0);
        expect(parseFloat(result.bnbReceived)).to.be.gt(0);
      });
    });
  });

  describe("Real-time Data Updates", function () {
    it("Should simulate real-time token info updates for frontend", async function () {
      const initialInfo = await launchpad.getTokenInfo(await token.getAddress());

      // Simulate frontend initial data
      const frontendData = {
        tokenAddress: initialInfo.tokenAddress,
        name: initialInfo.name,
        symbol: initialInfo.symbol,
        metadata: initialInfo.metadata,
        creator: initialInfo.creator,
        soldSupply: initialInfo.soldSupply.toString(),
        totalBNB: initialInfo.totalBNB.toString(),
        currentPrice: await calculateCurrentPrice(initialInfo.soldSupply, await launchpad.INITIAL_PRICE(), await launchpad.K_FACTOR()),
        graduated: initialInfo.graduated,
        exists: initialInfo.exists
      };

      // Perform buy operation
      await launchpad.connect(buyer).buy(await token.getAddress(), { value: ethers.parseEther("1") });

      // Get updated info
      const updatedInfo = await launchpad.getTokenInfo(await token.getAddress());

      // Verify frontend would see updated data
      expect(updatedInfo.soldSupply > initialInfo.soldSupply).to.be.true;
      expect(updatedInfo.totalBNB > initialInfo.totalBNB).to.be.true;

      const updatedFrontendData = {
        ...frontendData,
        soldSupply: updatedInfo.soldSupply.toString(),
        totalBNB: updatedInfo.totalBNB.toString(),
        currentPrice: await calculateCurrentPrice(updatedInfo.soldSupply, await launchpad.INITIAL_PRICE(), await launchpad.K_FACTOR())
      };

      expect(updatedFrontendData.soldSupply).to.not.equal(frontendData.soldSupply);
      expect(updatedFrontendData.totalBNB).to.not.equal(frontendData.totalBNB);
    });

    it("Should simulate real-time price tracking for frontend", async function () {
      const priceHistory = [];

      // Track price over multiple buys
      for (let i = 0; i < 5; i++) {
        const tokenInfo = await launchpad.getTokenInfo(await token.getAddress());
        const currentPrice = await calculateCurrentPrice(tokenInfo.soldSupply, await launchpad.INITIAL_PRICE(), await launchpad.K_FACTOR());

        priceHistory.push({
          step: i,
          soldSupply: tokenInfo.soldSupply.toString(),
          price: currentPrice.toString(),
          timestamp: Date.now()
        });

        if (i < 4) { // Don't buy on last iteration
          await launchpad.connect(buyer).buy(await token.getAddress(), { value: ethers.parseEther("1") });
        }
      }

      // Verify price increases over time
      for (let i = 1; i < priceHistory.length; i++) {
        const currentPrice = BigInt(priceHistory[i].price);
        const previousPrice = BigInt(priceHistory[i - 1].price);
        expect(currentPrice >= previousPrice).to.be.true;
      }

      expect(priceHistory).to.have.length(5);
    });
  });

  describe("Error Handling for Frontend", function () {
    it("Should provide clear error messages for frontend", async function () {
      const tokenAddress = await token.getAddress();
      const errorScenarios = [
        {
          name: "Insufficient BNB",
          operation: () => launchpad.connect(buyer).buy(tokenAddress, { value: 0 }),
          expectedError: "BNB amount must be greater than 0"
        },
        {
          name: "Invalid token address",
          operation: () => launchpad.connect(buyer).buy(ethers.ZeroAddress, { value: ethers.parseEther("1") }),
          expectedError: "Token does not exist"
        },
        {
          name: "Insufficient token balance",
          operation: () => launchpad.connect(buyer).sell(tokenAddress, ethers.parseEther("1000")),
          expectedError: "Insufficient token balance"
        }
      ];

      const results = [];

      for (const scenario of errorScenarios) {
        try {
          await scenario.operation();
          results.push({
            scenario: scenario.name,
            success: false,
            error: "Expected transaction to revert"
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const hasExpectedError = errorMessage.includes(scenario.expectedError);

          results.push({
            scenario: scenario.name,
            success: hasExpectedError,
            error: errorMessage,
            userFriendlyError: scenario.expectedError
          });
        }
      }

      results.forEach(result => {
        expect(result.success).to.be.true;
        expect(result.userFriendlyError).to.be.a('string');
      });
    });

    it("Should handle transaction status updates for frontend", async function () {
      const tx = await launchpad.connect(buyer).buy(await token.getAddress(), { value: ethers.parseEther("1") });

      // Simulate frontend transaction status tracking
      const transactionStatus: {
        hash: string;
        status: string;
        gasUsed: string | null;
        blockNumber: number | null;
        confirmations: number;
      } = {
        hash: tx.hash,
        status: "pending",
        gasUsed: null,
        blockNumber: null,
        confirmations: 0
      };

      // Wait for transaction
      const receipt = await tx.wait();

      // Update status
      transactionStatus.status = "confirmed";
      transactionStatus.gasUsed = receipt!.gasUsed.toString();
      transactionStatus.blockNumber = receipt!.blockNumber;
      transactionStatus.confirmations = 1;

      expect(transactionStatus.hash).to.equal(tx.hash);
      expect(transactionStatus.status).to.equal("confirmed");
      expect(transactionStatus.gasUsed).to.be.a('string');
      expect(transactionStatus.blockNumber).to.be.a('number');
      expect(transactionStatus.confirmations).to.be.gte(1);
    });
  });

  describe("Pagination and Data Loading", function () {
    it("Should simulate token list pagination for frontend", async function () {
      // Create multiple tokens
      const tokenCount = 10;
      for (let i = 0; i < tokenCount; i++) {
        await launchpad.connect(creator).createToken(
          `Paginated Token ${i}`,
          `PG${i}`,
          `https://example.com/paginated/${i}.json`,
          { value: CREATE_FEE }
        );
      }

      // Get all tokens
      const allTokens = await launchpad.getAllTokens();
      expect(allTokens.length).to.be.gte(tokenCount);

      // Simulate frontend pagination
      const pageSize = 3;
      const pages = [];

      for (let i = 0; i < allTokens.length; i += pageSize) {
        const pageTokens = allTokens.slice(i, i + pageSize);
        const pageData = [];

        for (const tokenAddress of pageTokens) {
          const tokenInfo = await launchpad.getTokenInfo(tokenAddress);
          pageData.push({
            address: tokenAddress,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            creator: tokenInfo.creator,
            soldSupply: tokenInfo.soldSupply.toString(),
            totalBNB: tokenInfo.totalBNB.toString(),
            graduated: tokenInfo.graduated
          });
        }

        pages.push({
          page: Math.floor(i / pageSize) + 1,
          tokens: pageData,
          hasNext: i + pageSize < allTokens.length
        });
      }

      expect(pages.length).to.be.gte(Math.ceil(tokenCount / pageSize));
      pages.forEach(page => {
        expect(page.tokens.length).to.be.lte(pageSize);
        expect(page.page).to.be.a('number');
      });
    });
  });

  // Helper function to calculate current price
  async function calculateCurrentPrice(soldSupply: bigint, initialPrice: bigint, slope: bigint): Promise<bigint> {
    return initialPrice + slope * soldSupply;
  }
});
