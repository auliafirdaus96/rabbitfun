import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { CONTRACTS, NETWORKS, DEFAULT_NETWORK } from '@/constants/contracts';

interface WalletState {
  address: string | null;
  provider: BrowserProvider | null;
  signer: any | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  metadata: string;
  creator: string;
  soldSupply: string;
  totalBNB: string;
  initialPrice: string;
  slope: string;
  graduated: boolean;
  exists: boolean;
}

export const useWeb3 = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const [launchpadContract, setLaunchpadContract] = useState<Contract | null>(null);

  // Initialize provider and contract
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setWalletState(prev => ({ ...prev, provider }));
    }
  }, []);

  // Get launchpad contract instance
  useEffect(() => {
    if (walletState.provider && walletState.signer && CONTRACTS.LAUNCHPAD.ADDRESS) {
      const contract = new Contract(
        CONTRACTS.LAUNCHPAD.ADDRESS,
        CONTRACTS.LAUNCHPAD.ABI,
        walletState.signer
      );
      setLaunchpadContract(contract);
    }
  }, [walletState.provider, walletState.signer]);

  // Connect wallet with forced confirmation
  const connectWallet = useCallback(async (forceConfirmation: boolean = true) => {
    if (!window.ethereum) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }));
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = new BrowserProvider(window.ethereum);

      // Always request fresh account access to trigger confirmation
      const accounts = await provider.send('eth_requestAccounts', []);

      // Force disconnect previous session if requesting fresh connection
      if (forceConfirmation && walletState.isConnected) {
        try {
          // Create a new provider instance to force fresh connection
          const freshProvider = new BrowserProvider(window.ethereum);
          const freshAccounts = await freshProvider.send('eth_requestAccounts', []);
          const signer = await freshProvider.getSigner();
          const network = await freshProvider.getNetwork();

          setWalletState({
            address: freshAccounts[0],
            provider: freshProvider,
            signer,
            chainId: Number(network.chainId),
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        } catch (freshError: any) {
          throw freshError;
        }
      } else {
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        setWalletState({
          address: accounts[0],
          provider,
          signer,
          chainId: Number(network.chainId),
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      }
    } catch (error: any) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, [walletState.isConnected]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      address: null,
      provider: null,
      signer: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    setLaunchpadContract(null);
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
        if (network) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
        }
      } else {
        throw error;
      }
    }
  }, []);

  // Create token with confirmation
  const createToken = useCallback(async (
    name: string,
    symbol: string,
    metadata: string
  ) => {
    if (!launchpadContract || !walletState.signer) {
      throw new Error('Wallet not connected or contract not available');
    }

    // Verify wallet connection is active
    if (!walletState.isConnected) {
      await connectWallet(true);
    }

    // Re-request account access to trigger confirmation
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const createFee = parseEther('0.005'); // 0.005 BNB

    // Add gas estimation and higher gas limit for confirmation
    const estimatedGas = await launchpadContract.createToken.estimateGas(
      name,
      symbol,
      metadata,
      { value: createFee }
    );

    const tx = await launchpadContract.createToken(name, symbol, metadata, {
      value: createFee,
      gasLimit: (estimatedGas * BigInt(120)) / BigInt(100), // 20% buffer for confirmation
    });

    return tx;
  }, [launchpadContract, walletState.signer, walletState.isConnected, connectWallet]);

  // Buy tokens with confirmation
  const buyTokens = useCallback(async (
    tokenAddress: string,
    bnbAmount: string
  ) => {
    if (!launchpadContract || !walletState.signer) {
      throw new Error('Wallet not connected or contract not available');
    }

    // Verify wallet connection is active
    if (!walletState.isConnected) {
      await connectWallet(true);
    }

    // Re-request account access to trigger confirmation
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const value = parseEther(bnbAmount);

    // Add gas estimation for confirmation
    const estimatedGas = await launchpadContract.buy.estimateGas(tokenAddress, {
      value,
    });

    const tx = await launchpadContract.buy(tokenAddress, {
      value,
      gasLimit: (estimatedGas * BigInt(120)) / BigInt(100), // 20% buffer for confirmation
    });

    return tx;
  }, [launchpadContract, walletState.signer, walletState.isConnected, connectWallet]);

  // Sell tokens with confirmation
  const sellTokens = useCallback(async (
    tokenAddress: string,
    tokenAmount: string
  ) => {
    if (!launchpadContract || !walletState.signer) {
      throw new Error('Wallet not connected or contract not available');
    }

    // Verify wallet connection is active
    if (!walletState.isConnected) {
      await connectWallet(true);
    }

    // Re-request account access to trigger confirmation
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const tokenContract = new Contract(tokenAddress, CONTRACTS.TOKEN.ABI, walletState.signer);

    // First approve the launchpad to spend tokens (with confirmation)
    const approveEstimatedGas = await tokenContract.approve.estimateGas(
      CONTRACTS.LAUNCHPAD.ADDRESS,
      tokenAmount
    );

    const approveTx = await tokenContract.approve(
      CONTRACTS.LAUNCHPAD.ADDRESS,
      tokenAmount,
      {
        gasLimit: (approveEstimatedGas * BigInt(120)) / BigInt(100), // 20% buffer for confirmation
      }
    );
    await approveTx.wait();

    // Then sell the tokens (with confirmation)
    const sellEstimatedGas = await launchpadContract.sell.estimateGas(
      tokenAddress,
      tokenAmount
    );

    const sellTx = await launchpadContract.sell(tokenAddress, tokenAmount, {
      gasLimit: (sellEstimatedGas * BigInt(120)) / BigInt(100), // 20% buffer for confirmation
    });

    return sellTx;
  }, [launchpadContract, walletState.signer, walletState.isConnected, connectWallet]);

  // Get token info
  const getTokenInfo = useCallback(async (tokenAddress: string): Promise<TokenInfo> => {
    if (!launchpadContract) {
      throw new Error('Contract not available');
    }

    const tokenInfo = await launchpadContract.getTokenInfo(tokenAddress);
    return {
      tokenAddress: tokenInfo.tokenAddress,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      metadata: tokenInfo.metadata,
      creator: tokenInfo.creator,
      soldSupply: formatEther(tokenInfo.soldSupply),
      totalBNB: formatEther(tokenInfo.totalBNB),
      initialPrice: formatEther(tokenInfo.initialPrice),
      slope: tokenInfo.slope.toString(),
      graduated: tokenInfo.graduated,
      exists: tokenInfo.exists,
    };
  }, [launchpadContract]);

  // Get all tokens
  const getAllTokens = useCallback(async (): Promise<string[]> => {
    if (!launchpadContract) {
      throw new Error('Contract not available');
    }

    return await launchpadContract.getAllTokens();
  }, [launchpadContract]);

  // Calculate token purchase amount
  const calculateTokenPurchase = useCallback(async (
    currentSupply: string,
    bnbAmount: string,
    initialPrice: string,
    slope: string
  ): Promise<string> => {
    if (!launchpadContract) {
      throw new Error('Contract not available');
    }

    // Note: Smart contract ignores initialPrice and slope parameters, uses internal constants
    const tokenAmount = await launchpadContract.calculateTokenPurchase(
      parseEther(currentSupply),
      parseEther(bnbAmount),
      parseEther(initialPrice),
      slope // This is K_FACTOR (543) but contract uses its internal constant
    );

    return formatEther(tokenAmount);
  }, [launchpadContract]);

  // Calculate token sale amount
  const calculateTokenSale = useCallback(async (
    currentSupply: string,
    tokenAmount: string,
    initialPrice: string,
    slope: string
  ): Promise<string> => {
    if (!launchpadContract) {
      throw new Error('Contract not available');
    }

    const bnbAmount = await launchpadContract.calculateTokenSale(
      parseEther(currentSupply),
      parseEther(tokenAmount),
      parseEther(initialPrice),
      slope
    );

    return formatEther(bnbAmount);
  }, [launchpadContract]);

  // Get user token balance
  const getTokenBalance = useCallback(async (tokenAddress: string): Promise<string> => {
    if (!walletState.provider) {
      throw new Error('Provider not available');
    }

    const tokenContract = new Contract(tokenAddress, CONTRACTS.TOKEN.ABI, walletState.provider);
    const balance = await tokenContract.balanceOf(walletState.address);
    return formatEther(balance);
  }, [walletState.provider, walletState.address]);

  // Get user BNB balance
  const getBNBBalance = useCallback(async (): Promise<string> => {
    if (!walletState.provider || !walletState.address) {
      throw new Error('Provider or address not available');
    }

    const balance = await walletState.provider.getBalance(walletState.address);
    return formatEther(balance);
  }, [walletState.provider, walletState.address]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== walletState.address) {
          // Removed auto-connect - user must manually connect
          disconnectWallet();
        }
      };

      const handleChainChanged = (chainId: string) => {
        setWalletState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16),
        }));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [walletState.address, connectWallet, disconnectWallet]);

  return {
    // Wallet state
    ...walletState,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,

    // Contract functions
    createToken,
    buyTokens,
    sellTokens,
    getTokenInfo,
    getAllTokens,
    calculateTokenPurchase,
    calculateTokenSale,
    getTokenBalance,
    getBNBBalance,

    // Contract instance
    launchpadContract,
  };
};
