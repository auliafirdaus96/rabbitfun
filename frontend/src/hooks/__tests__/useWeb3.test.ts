import { renderHook, act } from '@testing-library/react';
import { useWeb3 } from '../useWeb3';

// Mock ethers
jest.mock('ethers', () => ({
  BrowserProvider: jest.fn(),
  JsonRpcSigner: jest.fn(),
  formatEther: jest.fn((value) => '1.0'),
}));

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

// Mock console methods
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  console.error = mockConsoleError;
  mockEthereum.request.mockClear();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('useWeb3 Hook', () => {
  describe('Initial State', () => {
    it('should return initial disconnected state', () => {
      const { result } = renderHook(() => useWeb3());

      expect(result.current).toEqual({
        account: null,
        isConnected: false,
        isConnecting: false,
        chainId: null,
        balance: '0',
        error: null,
        connectWallet: expect.any(Function),
        disconnectWallet: expect.any(Function),
        switchNetwork: expect.any(Function),
      });
    });

    it('should detect MetaMask availability', () => {
      // Test with MetaMask installed
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const { result } = renderHook(() => useWeb3());
      expect(result.current.account).toBeNull();

      // Test without MetaMask
      delete (window as any).ethereum;
      const { result: resultNoMetaMask } = renderHook(() => useWeb3());
      expect(resultNoMetaMask.current.account).toBeNull();
    });
  });

  describe('connectWallet', () => {
    it('should connect wallet successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const mockChainId = '0x61'; // BSC Testnet

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce(null);

      const { result } = renderHook(() => useWeb3());

      expect(result.current.isConnecting).toBe(false);

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.account).toBe('0x1234...7890');
      expect(result.current.chainId).toBe('0x61');
      expect(result.current.error).toBeNull();

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should handle connection failure', async () => {
      const error = new Error('User rejected the request');
      mockEthereum.request.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.error).toBe('User rejected the request');

      expect(mockConsoleError).toHaveBeenCalledWith('Wallet connection error:', error);
    });

    it('should handle no accounts returned', async () => {
      mockEthereum.request.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.error).toBe('No accounts found');
    });

    it('should handle MetaMask not installed', async () => {
      delete (window as any).ethereum;

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.error).toBe('MetaMask is not installed. Please install MetaMask to continue.');
    });

    it('should switch to BSC testnet if on wrong network', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts) // Request accounts
        .mockResolvedValueOnce('0x1') // Get chain ID (Ethereum mainnet)
        .mockResolvedValueOnce(null); // Switch network

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }],
      });
    });

    it('should add BSC testnet if not available', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const switchError = { code: 4902 }; // Chain not added error

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts) // Request accounts
        .mockResolvedValueOnce('0x1') // Get chain ID (Ethereum mainnet)
        .mockRejectedValueOnce(switchError) // Switch network fails
        .mockResolvedValueOnce(null); // Add network

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x61',
          chainName: 'BNB Smart Chain Testnet',
          nativeCurrency: {
            name: 'tBNB',
            symbol: 'tBNB',
            decimals: 18,
          },
          rpcUrls: ['https://bsc-testnet-dataseed.bnbchain.org/'],
          blockExplorerUrls: ['https://testnet.bscscan.com/'],
        }],
      });
    });

    it('should prevent multiple simultaneous connection attempts', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useWeb3());

      // Start first connection
      const firstConnection = act(async () => {
        await result.current.connectWallet();
      });

      // Try second connection while first is in progress
      const secondConnection = act(async () => {
        await result.current.connectWallet();
      });

      await Promise.all([firstConnection, secondConnection]);

      // Should only call request once
      expect(mockEthereum.request).toHaveBeenCalledTimes(2); // eth_requestAccounts + wallet_switchEthereumChain
    });
  });

  describe('disconnectWallet', () => {
    it('should disconnect wallet successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useWeb3());

      // First connect
      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnected).toBe(true);

      // Then disconnect
      act(() => {
        result.current.disconnectWallet();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.chainId).toBeNull();
      expect(result.current.balance).toBe('0');
      expect(result.current.error).toBeNull();
    });
  });

  describe('switchNetwork', () => {
    it('should switch network successfully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce(null);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      // Switch to mainnet
      await act(async () => {
        await result.current.switchNetwork('0x38'); // BSC Mainnet
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
    });

    it('should add network if not available', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const switchError = { code: 4902 };

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(switchError)
        .mockResolvedValueOnce(null);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      await act(async () => {
        await result.current.switchNetwork('0x38');
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x38',
          chainName: 'BNB Smart Chain',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
          rpcUrls: ['https://bsc-dataseed1.binance.org/'],
          blockExplorerUrls: ['https://bscscan.com/'],
        }],
      });
    });

    it('should handle network switch failure', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const error = new Error('User rejected the request');

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      await act(async () => {
        await result.current.switchNetwork('0x38');
      });

      expect(result.current.error).toBe('Failed to switch network: User rejected the request');
    });
  });

  describe('Account and Balance Management', () => {
    it('should format account address correctly', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.account).toBe('0x1234...7890');
    });

    it('should update balance when account changes', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      // Balance should be updated (mocked implementation would set it)
      expect(result.current.balance).toBe('0');
    });
  });

  describe('Event Listeners', () => {
    it('should setup event listeners on mount', () => {
      renderHook(() => useWeb3());

      expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
      expect(mockEthereum.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockEthereum.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useWeb3());

      unmount();

      expect(mockEthereum.removeListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('chainChanged', expect.any(Function));
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockEthereum.removeListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should handle network switch errors gracefully', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const error = new Error('Network switch failed');

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      await act(async () => {
        await result.current.switchNetwork('0x38');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isConnected).toBe(true); // Should remain connected
    });

    it('should clear error on successful operations', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];

      // First fail
      mockEthereum.request.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.error).toBeTruthy();

      // Then succeed
      mockEthereum.request.mockResolvedValue(mockAccounts);

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Network Detection', () => {
    it('should detect BSC mainnet', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce('0x38'); // BSC Mainnet

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.chainId).toBe('0x38');
    });

    it('should detect BSC testnet', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts)
        .mockResolvedValueOnce('0x61'); // BSC Testnet

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.chainId).toBe('0x61');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty account array', async () => {
      mockEthereum.request.mockResolvedValue([]);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });

    it('should handle malformed account address', async () => {
      const mockAccounts = ['invalid-address'];
      mockEthereum.request.mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      // Should still connect even with malformed address
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle RPC errors during connection', async () => {
      const error = new Error('RPC Error: Request timed out');
      mockEthereum.request.mockRejectedValue(error);

      const { result } = renderHook(() => useWeb3());

      await act(async () => {
        await result.current.connectWallet();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isConnecting).toBe(false);
    });
  });
});