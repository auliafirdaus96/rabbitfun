import { ethers } from 'ethers';

// BNB Smart Chain Testnet Configuration
export const BSC_CONFIG = {
  chainId: '0x61', // 97 in hex
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://bsc-testnet-dataseed.bnbchain.org/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

export class WalletService {
  public provider: ethers.BrowserProvider | null = null;
  public signer: ethers.JsonRpcSigner | null = null;

  // Check if MetaMask is installed
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
  }

  // Connect to MetaMask wallet
  async connectWallet(): Promise<{ address: string; isConnected: boolean }> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      const ethereum = (window as any).ethereum;

      // Request account access
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Check if we're on the correct network
      await this.switchToBSCTestnetNetwork();

      // Create provider and signer
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      const address = await this.signer.getAddress();

      return {
        address: this.formatAddress(address),
        isConnected: true,
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  // Switch to BSC Testnet network
  private async switchToBSCTestnetNetwork(): Promise<void> {
    const ethereum = (window as any).ethereum;

    try {
      // Try to switch to BSC
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CONFIG.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add BSC network to MetaMask
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_CONFIG],
          });
        } catch (addError) {
          console.error('Error adding BSC network:', addError);
          throw new Error('Failed to add BSC network to MetaMask');
        }
      } else {
        console.error('Error switching to BSC network:', switchError);
        throw new Error('Failed to switch to BSC network');
      }
    }
  }

  // Disconnect wallet
  disconnectWallet(): void {
    this.provider = null;
    this.signer = null;
  }

  // Get current account
  async getCurrentAccount(): Promise<string | null> {
    if (!this.signer) return null;

    try {
      const address = await this.signer.getAddress();
      return this.formatAddress(address);
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  // Get full wallet address
  async getFullAddress(): Promise<string | null> {
    if (!this.signer) return null;

    try {
      const address = await this.signer.getAddress();
      return address;
    } catch (error) {
      console.error('Error getting full address:', error);
      return null;
    }
  }

  // Format address to shortened version
  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Get BNB balance
  async getBNBBalance(): Promise<string> {
    if (!this.provider || !this.signer) return '0';

    try {
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting BNB balance:', error);
      return '0';
    }
  }

  // Check if wallet is connected
  isWalletConnected(): boolean {
    return this.signer !== null;
  }
}

export const walletService = new WalletService();