import { WalletService, BSC_CONFIG, walletService } from '../wallet';

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

// Mock ethers
jest.mock('ethers', () => ({
  BrowserProvider: jest.fn().mockImplementation(() => ({
    getSigner: jest.fn().mockResolvedValue({
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    }),
    getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')), // 1 ETH in wei
  })),
  JsonRpcSigner: jest.fn(),
  formatEther: jest.fn((value) => '1.0'),
}));

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    walletService.disconnectWallet();
  });

  describe('MetaMask Detection', () => {
    it('should detect MetaMask when installed', () => {
      expect(walletService.isMetaMaskInstalled()).toBe(true);
    });

    it('should detect MetaMask when not installed', () => {
      delete (window as any).ethereum;
      const noMetaMaskService = new WalletService();
      expect(noMetaMaskService.isMetaMaskInstalled()).toBe(false);
    });
  });

  describe('Wallet Connection', () => {
    it('should connect wallet successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce(null);

      const result = await walletService.connectWallet();

      expect(result).toEqual({
        address: '0x1234...7890',
        isConnected: true,
      });
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should handle connection failure - MetaMask not installed', async () => {
      delete (window as any).ethereum;
      const noMetaMaskService = new WalletService();

      await expect(noMetaMaskService.connectWallet()).rejects.toThrow(
        'MetaMask is not installed. Please install MetaMask to continue.'
      );
    });

    it('should handle connection failure - no accounts', async () => {
      mockEthereum.request.mockResolvedValue([]);

      await expect(walletService.connectWallet()).rejects.toThrow(
        'No accounts found. Please connect your MetaMask wallet.'
      );
    });

    it('should handle connection failure - request rejected', async () => {
      const error = new Error('User rejected the request');
      mockEthereum.request.mockRejectedValue(error);

      await expect(walletService.connectWallet()).rejects.toThrow('User rejected the request');
    });
  });

  describe('Network Switching', () => {
    it('should switch to BSC testnet successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce(null);

      await walletService.connectWallet();

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CONFIG.chainId }],
      });
    });

    it('should add BSC testnet when not available', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const switchError = { code: 4902 }; // Chain not added error

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(switchError)
        .mockResolvedValueOnce(null);

      await walletService.connectWallet();

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [BSC_CONFIG],
      });
    });

    it('should handle network switching failure', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const error = new Error('Failed to switch network');

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(error);

      await expect(walletService.connectWallet()).rejects.toThrow('Failed to switch network');
    });

    it('should handle adding network failure', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const switchError = { code: 4902 };
      const addError = new Error('Failed to add network');

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(switchError)
        .mockRejectedValueOnce(addError);

      await expect(walletService.connectWallet()).rejects.toThrow('Failed to add BSC network to MetaMask');
    });
  });

  describe('Wallet Disconnection', () => {
    it('should disconnect wallet successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      await walletService.connectWallet();
      expect(walletService.isWalletConnected()).toBe(true);

      walletService.disconnectWallet();
      expect(walletService.isWalletConnected()).toBe(false);
      expect(walletService.provider).toBeNull();
      expect(walletService.signer).toBeNull();
    });
  });

  describe('Account Management', () => {
    beforeEach(async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);
      await walletService.connectWallet();
    });

    it('should get current account successfully', async () => {
      const account = await walletService.getCurrentAccount();
      expect(account).toBe('0x1234...7890');
    });

    it('should get full address successfully', async () => {
      const fullAddress = await walletService.getFullAddress();
      expect(fullAddress).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should return null when wallet not connected', async () => {
      walletService.disconnectWallet();
      const account = await walletService.getCurrentAccount();
      expect(account).toBeNull();
    });

    it('should handle errors when getting current account', async () => {
      const error = new Error('Failed to get address');
      const mockSigner = {
        getAddress: jest.fn().mockRejectedValue(error),
      };
      walletService.signer = mockSigner as any;

      const account = await walletService.getCurrentAccount();
      expect(account).toBeNull();
    });
  });

  describe('Balance Management', () => {
    beforeEach(async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);
      await walletService.connectWallet();
    });

    it('should get BNB balance successfully', async () => {
      const balance = await walletService.getBNBBalance();
      expect(balance).toBe('1.0');
    });

    it('should return 0 when wallet not connected', async () => {
      walletService.disconnectWallet();
      const balance = await walletService.getBNBBalance();
      expect(balance).toBe('0');
    });

    it('should handle errors when getting balance', async () => {
      const error = new Error('Failed to get balance');
      const mockProvider = {
        getBalance: jest.fn().mockRejectedValue(error),
      };
      walletService.provider = mockProvider as any;

      const balance = await walletService.getBNBBalance();
      expect(balance).toBe('0');
    });
  });

  describe('Connection Status', () => {
    it('should return false when wallet is not connected', () => {
      expect(walletService.isWalletConnected()).toBe(false);
    });

    it('should return true when wallet is connected', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      await walletService.connectWallet();
      expect(walletService.isWalletConnected()).toBe(true);
    });
  });

  describe('Address Formatting', () => {
    it('should format address correctly', () => {
      const fullAddress = '0x1234567890123456789012345678901234567890';
      const formattedAddress = walletService['formatAddress'](fullAddress);
      expect(formattedAddress).toBe('0x1234...7890');
    });

    it('should handle short addresses gracefully', () => {
      const shortAddress = '0x123456';
      const formattedAddress = walletService['formatAddress'](shortAddress);
      expect(formattedAddress).toBe('0x1234...7856');
    });
  });

  describe('Error Handling', () => {
    it('should handle Ethereum request errors', async () => {
      const error = { code: -32000, message: 'Internal error' };
      mockEthereum.request.mockRejectedValue(error);

      await expect(walletService.connectWallet()).rejects.toEqual(error);
    });

    it('should handle network errors gracefully', async () => {
      const error = new Error('Network error');
      mockEthereum.request.mockRejectedValue(error);

      // Should not throw unhandled errors
      await expect(walletService.connectWallet()).rejects.toThrow('Network error');
    });

    it('should handle signer creation errors', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      // Mock BrowserProvider to throw
      const { BrowserProvider } = require('ethers');
      BrowserProvider.mockImplementation(() => {
        throw new Error('Failed to create provider');
      });

      await expect(walletService.connectWallet()).rejects.toThrow('Failed to create provider');
    });
  });

  describe('BSC Configuration', () => {
    it('should have correct BSC testnet configuration', () => {
      expect(BSC_CONFIG.chainId).toBe('0x61');
      expect(BSC_CONFIG.chainName).toBe('BNB Smart Chain Testnet');
      expect(BSC_CONFIG.nativeCurrency.name).toBe('tBNB');
      expect(BSC_CONFIG.nativeCurrency.symbol).toBe('tBNB');
      expect(BSC_CONFIG.nativeCurrency.decimals).toBe(18);
      expect(BSC_CONFIG.rpcUrls).toContain('https://bsc-testnet-dataseed.bnbchain.org/');
      expect(BSC_CONFIG.blockExplorerUrls).toContain('https://testnet.bscscan.com/');
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton walletService instance', () => {
      expect(walletService).toBeInstanceOf(WalletService);
    });

    it('should maintain same instance across imports', () => {
      const walletService1 = walletService;
      const walletService2 = require('../wallet').walletService;
      expect(walletService1).toBe(walletService2);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full connection flow', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce(null);

      // Connect
      const result = await walletService.connectWallet();
      expect(result.isConnected).toBe(true);

      // Check status
      expect(walletService.isWalletConnected()).toBe(true);

      // Get account
      const account = await walletService.getCurrentAccount();
      expect(account).toBe('0x1234...7890');

      // Get balance
      const balance = await walletService.getBNBBalance();
      expect(balance).toBe('1.0');

      // Disconnect
      walletService.disconnectWallet();
      expect(walletService.isWalletConnected()).toBe(false);
    });

    it('should handle account changes correctly', async () => {
      const mockAccounts1 = ['0x1234567890123456789012345678901234567890'];
      const mockAccounts2 = ['0x9876543210987654321098765432109876543210'];

      mockEthereum.request.mockResolvedValue(mockAccounts1);
      await walletService.connectWallet();

      expect(await walletService.getFullAddress()).toBe('0x1234567890123456789012345678901234567890');

      // Simulate account change
      const newSigner = {
        getAddress: jest.fn().mockResolvedValue('0x9876543210987654321098765432109876543210'),
      };
      walletService.signer = newSigner as any;

      expect(await walletService.getFullAddress()).toBe('0x9876543210987654321098765432109876543210');
    });
  });
});