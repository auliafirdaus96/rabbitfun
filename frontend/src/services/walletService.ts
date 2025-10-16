import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletInfo {
  address: string;
  chainId: number;
  networkName: string;
}

export class WalletService {
  private static instance: WalletService;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined';
  }

  // Connect to MetaMask
  async connectWallet(): Promise<WalletInfo> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Create provider
      this.provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      await this.provider.send('eth_requestAccounts', []);

      // Get signer
      this.signer = await this.provider.getSigner();

      // Get address
      const address = await this.signer.getAddress();

      // Get network info
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      return {
        address,
        chainId,
        networkName: this.getNetworkName(chainId)
      };
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      throw new Error('Failed to connect to MetaMask. Please try again.');
    }
  }

  // Disconnect wallet (reset the service)
  disconnectWallet(): void {
    this.provider = null;
    this.signer = null;
  }

  // Get current wallet info
  async getWalletInfo(): Promise<WalletInfo | null> {
    if (!this.signer || !this.provider) {
      return null;
    }

    try {
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      return {
        address,
        chainId,
        networkName: this.getNetworkName(chainId)
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }

  // Switch to BSC Testnet
  async switchToBSCTestnet(): Promise<void> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    const BSC_TESTNET_CHAIN_ID = '0x61'; // 97 in hex

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_CHAIN_ID }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        await this.addBSCTestnet();
      } else {
        throw error;
      }
    }
  }

  // Add BSC Testnet to MetaMask
  private async addBSCTestnet(): Promise<void> {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: '0x61',
          chainName: 'BSC Testnet',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
          rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
          blockExplorerUrls: ['https://testnet.bscscan.com'],
        },
      ],
    });
  }

  // Get network name by chain ID
  private getNetworkName(chainId: number): string {
    switch (chainId) {
      case 1:
        return 'Ethereum Mainnet';
      case 56:
        return 'BSC Mainnet';
      case 97:
        return 'BSC Testnet';
      case 11155111:
        return 'Sepolia Testnet';
      default:
        return `Chain ID: ${chainId}`;
    }
  }

  // Get current provider
  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  // Get current signer
  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  // Send transaction (for token creation)
  async sendTransaction(transactionData: {
    to: string;
    value?: string;
    data?: string;
    gasLimit?: string;
  }): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.signer.sendTransaction(transactionData);
      return tx;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // Listen for account changes
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  // Listen for chain changes
  onChainChanged(callback: (chainId: string) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  // Remove event listeners
  removeAllListeners(): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.removeAllListeners();
    }
  }
}