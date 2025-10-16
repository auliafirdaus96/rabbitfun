import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useWeb3 } from './useWeb3';
import { useApi, usePriceCalculator } from './useApi';
import * as useReactQuery from './useReactQuery';
import { useWebSocket } from './useWebSocket';
import { webSocketService } from '@/services/websocket';
import { apiService } from '@/services/api';
import type { TokenInfo, Transaction } from '@/types/api';

interface UseEnhancedTokenTradingProps {
  tokenAddress: string;
  tokenInfo: TokenInfo;
  onTokenUpdate?: () => void;
}

export function useEnhancedTokenTrading({ tokenAddress, tokenInfo, onTokenUpdate }: UseEnhancedTokenTradingProps) {
  // Web3 integration
  const { isConnected, buyTokens, sellTokens, getTokenBalance, getBNBBalance } = useWeb3();

  // State for trading
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState('0');
  const [estimatedBNB, setEstimatedBNB] = useState('0');
  const [userTokenBalance, setUserTokenBalance] = useState('0');
  const [userBNBBalance, setUserBNBBalance] = useState('0');

  // API and React Query integration
  const { data: bondingCurveConfig } = useReactQuery.useBondingCurveConfig();
  const { data: analytics, refetch: refetchAnalytics } = useReactQuery.useTokenAnalytics(tokenAddress);
  const { calculations, calculateTokensOut, calculateBNBOut } = usePriceCalculator();

  // WebSocket for real-time updates
  const { subscribe } = useWebSocket();

  // Transaction history
  const { data: transactionHistory, refetch: refetchTransactions } = useReactQuery.useTransactionHistory(
    tokenAddress,
    { page: 1, limit: 10 }
  );

  // Load user balances
  const loadBalances = useCallback(async () => {
    try {
      const [tokenBalance, bnbBalance] = await Promise.all([
        getTokenBalance(tokenAddress),
        getBNBBalance(),
      ]);
      setUserTokenBalance(tokenBalance);
      setUserBNBBalance(bnbBalance);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  }, [tokenAddress, getTokenBalance, getBNBBalance]);

  useEffect(() => {
    if (isConnected && tokenAddress) {
      loadBalances();
    }
  }, [isConnected, tokenAddress, loadBalances]);

  // Subscribe to real-time updates
  useEffect(() => {
    const handlePriceUpdate = (data: any) => {
      if (data.tokenAddress === tokenAddress) {
        // Recalculate estimates when price updates
        if (buyAmount) {
          calculateBuyEstimate();
        }
        if (sellAmount) {
          calculateSellEstimate();
        }
      }
    };

    const handleNewTransaction = (data: any) => {
      if (data.tokenAddress === tokenAddress) {
        // Refresh balances and analytics
        loadBalances();
        refetchAnalytics();
        refetchTransactions();
        onTokenUpdate?.();
      }
    };

    subscribe(`token:${tokenAddress}`, handlePriceUpdate);
    webSocketService.on('token_price_update', handleNewTransaction);
    webSocketService.on('new_transaction', handleNewTransaction);

    return () => {
      webSocketService.off('token_price_update', handleNewTransaction);
      webSocketService.off('new_transaction', handleNewTransaction);
    };
  }, [tokenAddress, buyAmount, sellAmount]);

  // Calculate estimated tokens when buy amount changes
  useEffect(() => {
    if (buyAmount && parseFloat(buyAmount) > 0) {
      calculateBuyEstimate();
    } else {
      setEstimatedTokens('0');
    }
  }, [buyAmount, tokenInfo]);

  // Calculate estimated BNB when sell amount changes
  useEffect(() => {
    if (sellAmount && parseFloat(sellAmount) > 0) {
      calculateSellEstimate();
    } else {
      setEstimatedBNB('0');
    }
  }, [sellAmount, tokenInfo]);

  const calculateBuyEstimate = async () => {
    try {
      if (!tokenInfo) return;

      const soldSupply = parseFloat(tokenInfo.soldSupply || '0');
      const bnbAmount = parseFloat(buyAmount);

      // Use API calculation
      await calculateTokensOut(bnbAmount, soldSupply);

      // Fallback to frontend calculation if API fails
      if (calculations.tokensOut) {
        setEstimatedTokens(calculations.tokensOut.toString());
      }
    } catch (error) {
      console.error('Error calculating buy estimate:', error);
      setEstimatedTokens('0');
    }
  };

  const calculateSellEstimate = async () => {
    try {
      if (!tokenInfo) return;

      const soldSupply = parseFloat(tokenInfo.soldSupply || '0');
      const tokenAmount = parseFloat(sellAmount);

      // Use API calculation
      await calculateBNBOut(tokenAmount, soldSupply);

      // Fallback to frontend calculation if API fails
      if (calculations.bnbOut) {
        setEstimatedBNB(calculations.bnbOut.toString());
      }
    } catch (error) {
      console.error('Error calculating sell estimate:', error);
      setEstimatedBNB('0');
    }
  };

  // Enhanced buy function with API integration
  const handleBuy = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error('Please enter a valid BNB amount');
      return;
    }

    try {
      setIsProcessing(true);

      // Validate with backend before transaction
      const validationResponse = await apiService.calculateTokensOut(
        parseFloat(buyAmount),
        parseFloat(tokenInfo.soldSupply || '0')
      );

      if (!validationResponse.success) {
        throw new Error(validationResponse.error || 'Transaction validation failed');
      }

      // Proceed with blockchain transaction
      const tx = await buyTokens(tokenAddress, buyAmount);
      setTxHash(tx.hash);

      // Wait for transaction confirmation
      await tx.wait();

      toast.success('Transaction successful!');

      // Reset form and refresh data
      setBuyAmount('');
      setEstimatedTokens('0');
      await loadBalances();
      refetchAnalytics();
      refetchTransactions();
      onTokenUpdate?.();

    } catch (error: any) {
      console.error('Buy transaction error:', error);

      // Handle different error types
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient BNB balance');
      } else if (error.message?.includes('exceeds target supply')) {
        toast.error('Exceeds target supply');
      } else {
        toast.error(error.message || 'Transaction failed');
      }
    } finally {
      setIsProcessing(false);
      setTxHash('');
    }
  };

  // Enhanced sell function with API integration
  const handleSell = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error('Please enter a valid token amount');
      return;
    }

    try {
      setIsProcessing(true);

      // Validate balance
      const balance = parseFloat(userTokenBalance);
      const sellAmountNum = parseFloat(sellAmount);

      if (sellAmountNum > balance) {
        toast.error('Insufficient token balance');
        return;
      }

      // Validate with backend before transaction
      const validationResponse = await apiService.calculateBNBOut(
        sellAmountNum,
        parseFloat(tokenInfo.soldSupply || '0')
      );

      if (!validationResponse.success) {
        throw new Error(validationResponse.error || 'Transaction validation failed');
      }

      // Proceed with blockchain transaction
      const tx = await sellTokens(tokenAddress, sellAmount);
      setTxHash(tx.hash);

      // Wait for transaction confirmation
      await tx.wait();

      toast.success('Transaction successful!');

      // Reset form and refresh data
      setSellAmount('');
      setEstimatedBNB('0');
      await loadBalances();
      refetchAnalytics();
      refetchTransactions();
      onTokenUpdate?.();

    } catch (error: any) {
      console.error('Sell transaction error:', error);

      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.message?.includes('insufficient')) {
        toast.error('Insufficient balance');
      } else {
        toast.error(error.message || 'Transaction failed');
      }
    } finally {
      setIsProcessing(false);
      setTxHash('');
    }
  };

  // Enhanced fee calculation with API data
  const calculateFees = (amount: string, type: 'buy' | 'sell' = 'buy') => {
    const amountNum = parseFloat(amount) || 0;
    const totalFeePercent = bondingCurveConfig?.TOTAL_FEE || 0.0125; // 1.25%
    const platformFeePercent = bondingCurveConfig?.PLATFORM_FEE || 0.01; // 1%
    const creatorFeePercent = bondingCurveConfig?.CREATOR_FEE || 0.0025; // 0.25%

    const totalFee = amountNum * totalFeePercent;
    const platformFee = amountNum * platformFeePercent;
    const creatorFee = amountNum * creatorFeePercent;
    const netAmount = amountNum - totalFee;

    return {
      totalFee: totalFee.toFixed(6),
      platformFee: platformFee.toFixed(6),
      creatorFee: creatorFee.toFixed(6),
      netAmount: netAmount.toFixed(6)
    };
  };

  // Get current price from API or calculate locally
  const getCurrentPrice = useCallback(() => {
    if (calculations.price) {
      return calculations.price;
    }

    // Fallback to local calculation
    if (!tokenInfo) return 0;
    const soldSupply = parseFloat(tokenInfo.soldSupply || '0');
    const initialPrice = parseFloat(tokenInfo.initialPrice || '0') / 1e10; // Convert from wei
    return initialPrice; // Simplified for now
  }, [calculations.price, tokenInfo]);

  return {
    // Form state
    buyAmount,
    setBuyAmount,
    sellAmount,
    setSellAmount,
    isProcessing,
    txHash,
    estimatedTokens,
    estimatedBNB,

    // Balances
    userTokenBalance,
    userBNBBalance,
    loadBalances,

    // Trading functions
    handleBuy,
    handleSell,

    // Utilities
    calculateFees,
    getCurrentPrice,

    // Data
    bondingCurveConfig,
    analytics,
    calculations,
    transactionHistory,

    // Connection status
    isConnected,

    // Refresh functions
    refreshData: async () => {
      await loadBalances();
      await refetchAnalytics();
      await refetchTransactions();
      onTokenUpdate?.();
    }
  };
}