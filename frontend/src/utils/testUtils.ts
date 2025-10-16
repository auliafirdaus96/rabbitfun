// Testing utilities for Ahiru Launchpad

export interface TestWallet {
  name: string;
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface TestTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: number;
}

export interface TestToken {
  name: string;
  symbol: string;
  address: string;
  creator: string;
  totalSupply: string;
}

export class TestUtils {
  // Test configuration
  static readonly TEST_CONFIG = {
    BSC_TESTNET: {
      chainId: 97,
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      explorerUrl: 'https://testnet.bscscan.com'
    },
    BSC_MAINNET: {
      chainId: 56,
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      explorerUrl: 'https://bscscan.com'
    }
  };

  // Generate test data
  static generateTestTokenName(): string {
    const adjectives = ['Test', 'Demo', 'Sample', 'Mock', 'Beta', 'Alpha'];
    const nouns = ['Token', 'Coin', 'Asset', 'Tokenized', 'Digital'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const timestamp = Date.now().toString().slice(-4);
    return `${randomAdjective} ${randomNoun} ${timestamp}`;
  }

  static generateTestSymbol(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let symbol = '';
    for (let i = 0; i < 3; i++) {
      symbol += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return symbol;
  }

  static generateTestMetadata(): string {
    const testUrl = 'https://test-metadata.com/token/';
    const tokenId = Math.random().toString(36).substring(7);
    return `${testUrl}${tokenId}.json`;
  }

  // Validation helpers
  static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static isValidTransactionHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  static isValidAmount(amount: string): boolean {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER;
  }

  // Performance measurement
  static async measureAsyncExecution<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  }

  // Test scenarios
  static getTestScenarios() {
    return {
      tokenCreation: {
        valid: {
          name: this.generateTestTokenName(),
          symbol: this.generateTestSymbol(),
          metadata: this.generateTestMetadata()
        },
        invalid: {
          emptyName: { name: '', symbol: 'TEST', metadata: 'test.json' },
          emptySymbol: { name: 'Test Token', symbol: '', metadata: 'test.json' },
          longName: {
            name: 'A'.repeat(101),
            symbol: 'TEST',
            metadata: 'test.json'
          },
          longSymbol: {
            name: 'Test Token',
            symbol: 'A'.repeat(11),
            metadata: 'test.json'
          },
          longMetadata: {
            name: 'Test Token',
            symbol: 'TEST',
            metadata: 'A'.repeat(501)
          }
        }
      },
      trading: {
        buy: {
          validAmounts: ['0.001', '0.01', '0.1', '1'],
          invalidAmounts: ['0', '-1', 'abc', '1.7976931348623157e+308']
        },
        sell: {
          validAmounts: ['100', '1000', '10000'],
          invalidAmounts: ['0', '-100', 'abc', '1e100']
        }
      },
      edgeCases: {
        zeroBalance: '0',
        minimalAmount: '0.00000001',
        maximalAmount: '1000000000',
        veryLargeAmount: '1.7976931348623157e+308'
      }
    };
  }

  // Error simulation
  static simulateNetworkError(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Network error: Unable to connect to RPC node'));
      }, 1000);
    });
  }

  static simulateInsufficientFunds(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Insufficient funds for gas * price + value'));
      }, 500);
    });
  }

  static simulateUserRejection(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('MetaMask Tx Signature: User denied transaction signature.'));
      }, 300);
    });
  }

  // Logging utilities
  static logTestResult(testName: string, passed: boolean, error?: string) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = error ? ` - ${error}` : '';
    console.log(`${status} ${testName}${message}`);
  }

  static logTransaction(tx: TestTransaction, label: string) {
    console.log(`📝 ${label} Transaction:`, {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: tx.gasUsed,
      status: tx.status === 1 ? 'Success' : 'Failed'
    });
  }

  // Test helpers for specific features
  static async testWalletConnection() {
    console.log('🔍 Testing wallet connection...');

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        this.logTestResult('MetaMask Installation', false, 'MetaMask not found');
        return false;
      }

      this.logTestResult('MetaMask Installation', true);

      // Check if wallet is connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const isConnected = accounts.length > 0;

      this.logTestResult('Wallet Connection Status', isConnected);
      return isConnected;

    } catch (error) {
      this.logTestResult('Wallet Connection', false, (error as Error).message);
      return false;
    }
  }

  static async testNetworkSwitching() {
    console.log('🔍 Testing network switching...');

    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const expectedChainId = `0x${this.TEST_CONFIG.BSC_TESTNET.chainId.toString(16)}`;

      const isCorrectNetwork = currentChainId === expectedChainId;
      this.logTestResult('Network Check', isCorrectNetwork,
        isCorrectNetwork ? 'BSC Testnet' : `Current: ${currentChainId}`
      );

      return { currentChainId, isCorrectNetwork };

    } catch (error) {
      this.logTestResult('Network Check', false, (error as Error).message);
      return null;
    }
  }

  static async testBalanceChecking(address: string) {
    console.log('🔍 Testing balance checking...');

    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      const balanceInBNB = parseInt(balance, 16) / 1e18;
      this.logTestResult('Balance Retrieval', true, `${balanceInBNB} BNB`);

      return balanceInBNB;

    } catch (error) {
      this.logTestResult('Balance Retrieval', false, (error as Error).message);
      return 0;
    }
  }

  // Test data generators
  static generateTestSuite() {
    return {
      walletTests: [
        'testWalletConnection',
        'testNetworkSwitching',
        'testBalanceChecking'
      ],
      tokenCreationTests: [
        'testValidTokenCreation',
        'testEmptyNameValidation',
        'testEmptySymbolValidation',
        'testLengthValidation',
        'testInsufficientFundsHandling'
      ],
      tradingTests: [
        'testValidTokenPurchase',
        'testInsufficientBalanceHandling',
        'testTokenSale',
        'testApprovalProcess',
        'testFeeCalculation'
      ],
      edgeCaseTests: [
        'testZeroAmountHandling',
        'testVeryLargeAmountHandling',
        'testInvalidInputHandling',
        'testNetworkErrorHandling'
      ],
      securityTests: [
        'testInputSanitization',
        'testTransactionValidation',
        'testAccessControl',
        'testReentrancyProtection'
      ]
    };
  }
}

// Extend Window interface for testing
declare global {
  interface Window {
    testUtils?: typeof TestUtils;
  }
}

// Make TestUtils available globally for testing
if (typeof window !== 'undefined') {
  window.testUtils = TestUtils;
}