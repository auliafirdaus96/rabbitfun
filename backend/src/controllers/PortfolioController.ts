import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { databaseService } from '../services/databaseService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

interface PortfolioItem {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo?: string;
  balance: string;
  averageBuyPrice: string;
  totalInvested: string;
  currentValue: string;
  pnl: string;
  pnlPercentage: string;
  holdings: number; // percentage of total supply
}

interface PortfolioSummary {
  totalValue: string;
  totalInvested: string;
  totalPnl: string;
  totalPnlPercentage: string;
  tokensCount: number;
  topHoldings: PortfolioItem[];
}

export class PortfolioController {
  // Get user's complete portfolio
  async getPortfolio(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { page = 1, limit = 50, sortBy = 'currentValue', sortOrder = 'desc' } = req.query;

      // Get user
      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Get portfolio items from database
      const portfolioItems = await databaseService.prisma.portfolio.findMany({
        where: { userAddress: walletAddress },
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          token: {
            select: {
              address: true,
              name: true,
              symbol: true,
              imageUrl: true,
              currentPrice: true
            }
          }
        }
      });

      // Get total count
      const total = await databaseService.prisma.portfolio.count({
        where: { userAddress: walletAddress }
      });

      // Calculate portfolio summary
      const portfolioSummary = await this.calculatePortfolioSummary(walletAddress);

      // Format portfolio items
      const formattedItems: PortfolioItem[] = portfolioItems.map(item => {
        const currentValue = parseFloat(item.currentValue || '0');
        const totalInvested = parseFloat(item.totalInvested || '0');
        const pnl = currentValue - totalInvested;
        const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

        return {
          tokenAddress: item.tokenAddress,
          tokenName: item.token?.name || 'Unknown',
          tokenSymbol: item.token?.symbol || 'UNKNOWN',
          tokenLogo: item.token?.imageUrl,
          balance: item.tokenAmount,
          averageBuyPrice: item.averageBuyPrice,
          totalInvested: item.totalInvested,
          currentValue: item.currentValue,
          pnl: pnl.toString(),
          pnlPercentage: pnlPercentage.toFixed(2),
          holdings: 0 // Will be calculated if needed
        };
      });

      res.json({
        success: true,
        data: {
          portfolio: {
            items: formattedItems,
            summary: portfolioSummary,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              pages: Math.ceil(total / limitNum)
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting portfolio:', error);
      next(error);
    }
  }

  // Get portfolio summary
  async getPortfolioSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const summary = await this.calculatePortfolioSummary(walletAddress);

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      logger.error('Error getting portfolio summary:', error);
      next(error);
    }
  }

  // Get specific token holding details
  async getTokenHolding(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { tokenAddress } = req.params;

      if (!ethers.isAddress(tokenAddress)) {
        const error: AppError = new Error('Invalid token address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Get portfolio item
      const portfolioItem = await databaseService.prisma.portfolio.findUnique({
        where: {
          userAddress_tokenAddress: {
            userAddress: walletAddress,
            tokenAddress
          }
        },
        include: {
          token: {
            select: {
              address: true,
              name: true,
              symbol: true,
              imageUrl: true,
              currentPrice: true,
              totalBNB: true,
              soldSupply: true
            }
          }
        }
      });

      if (!portfolioItem) {
        const error: AppError = new Error('Token holding not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Get transaction history for this token
      const transactions = await databaseService.getTransactionsByUser(walletAddress, {
        limit: 100
      });

      const tokenTransactions = transactions.transactions.filter(
        tx => tx.tokenAddress === tokenAddress
      );

      // Calculate detailed metrics
      const currentValue = parseFloat(portfolioItem.currentValue || '0');
      const totalInvested = parseFloat(portfolioItem.totalInvested || '0');
      const pnl = currentValue - totalInvested;
      const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      const buyTransactions = tokenTransactions.filter(tx => tx.type === 'BUY');
      const sellTransactions = tokenTransactions.filter(tx => tx.type === 'SELL');

      const totalBuyAmount = buyTransactions.reduce((sum, tx) =>
        sum + parseFloat(tx.tokenAmount || '0'), 0
      );
      const totalSellAmount = sellTransactions.reduce((sum, tx) =>
        sum + parseFloat(tx.tokenAmount || '0'), 0
      );

      res.json({
        success: true,
        data: {
          holding: {
            tokenAddress: portfolioItem.tokenAddress,
            tokenName: portfolioItem.token?.name,
            tokenSymbol: portfolioItem.token?.symbol,
            tokenLogo: portfolioItem.token?.imageUrl,
            balance: portfolioItem.tokenAmount,
            averageBuyPrice: portfolioItem.averageBuyPrice,
            totalInvested: portfolioItem.totalInvested,
            currentValue: portfolioItem.currentValue,
            pnl: pnl.toString(),
            pnlPercentage: pnlPercentage.toFixed(2),
            metrics: {
              totalBought: totalBuyAmount.toString(),
              totalSold: totalSellAmount.toString(),
              netHolding: (totalBuyAmount - totalSellAmount).toString(),
              buyCount: buyTransactions.length,
              sellCount: sellTransactions.length,
              firstBuyDate: buyTransactions.length > 0 ? buyTransactions[0].createdAt : null,
              lastTransaction: tokenTransactions.length > 0 ? tokenTransactions[0].createdAt : null
            }
          },
          transactions: tokenTransactions.slice(0, 20) // Last 20 transactions
        }
      });
    } catch (error) {
      logger.error('Error getting token holding:', error);
      next(error);
    }
  }

  // Get portfolio performance history
  async getPortfolioHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { period = '7d' } = req.query;

      // Get user analytics data
      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Calculate date range based on period
      const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get historical data
      const analytics = await databaseService.prisma.userAnalytics.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate
          }
        },
        orderBy: { date: 'asc' }
      });

      // Get current portfolio value
      const currentSummary = await this.calculatePortfolioSummary(walletAddress);

      // Format history data
      const history = analytics.map(item => ({
        date: item.date,
        portfolioValue: item.portfolioValue,
        holdingsCount: item.holdingsCount,
        volumeTraded: item.volumeTraded
      }));

      // Add current data point
      if (history.length === 0 || history[history.length - 1].date < new Date()) {
        history.push({
          date: new Date(),
          portfolioValue: currentSummary.totalValue,
          holdingsCount: currentSummary.tokensCount,
          volumeTraded: '0' // This would need to be calculated from transactions
        });
      }

      res.json({
        success: true,
        data: {
          history,
          period,
          current: currentSummary
        }
      });
    } catch (error) {
      logger.error('Error getting portfolio history:', error);
      next(error);
    }
  }

  // Get portfolio performance metrics
  async getPerformanceMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      // Get all user transactions
      const transactions = await databaseService.getTransactionsByUser(walletAddress, {
        limit: 1000
      });

      // Calculate performance metrics
      const buyTransactions = transactions.transactions.filter(tx => tx.type === 'BUY');
      const sellTransactions = transactions.transactions.filter(tx => tx.type === 'SELL');

      const totalVolume = transactions.transactions.reduce((sum, tx) =>
        sum + parseFloat(tx.bnbAmount || '0'), 0
      );

      const totalBuys = buyTransactions.reduce((sum, tx) =>
        sum + parseFloat(tx.bnbAmount || '0'), 0
      );

      const totalSells = sellTransactions.reduce((sum, tx) =>
        sum + parseFloat(tx.bnbAmount || '0'), 0
      );

      // Best and worst performers
      const portfolioSummary = await this.calculatePortfolioSummary(walletAddress);

      // Calculate success rate (profitable sells)
      const profitableSells = sellTransactions.filter(sell => {
        const correspondingBuys = buyTransactions.filter(buy =>
          buy.tokenAddress === sell.tokenAddress &&
          new Date(buy.createdAt) < new Date(sell.createdAt)
        );

        if (correspondingBuys.length === 0) return false;

        const avgBuyPrice = correspondingBuys.reduce((sum, buy) =>
          sum + parseFloat(buy.price || '0'), 0
        ) / correspondingBuys.length;

        return parseFloat(sell.price || '0') > avgBuyPrice;
      });

      const successRate = sellTransactions.length > 0
        ? (profitableSells.length / sellTransactions.length) * 100
        : 0;

      res.json({
        success: true,
        data: {
          metrics: {
            totalTransactions: transactions.pagination.total,
            buyTransactions: buyTransactions.length,
            sellTransactions: sellTransactions.length,
            totalVolume: totalVolume.toString(),
            totalBuys: totalBuys.toString(),
            totalSells: totalSells.toString(),
            netVolume: (totalBuys - totalSells).toString(),
            successRate: successRate.toFixed(2),
            averageHoldTime: this.calculateAverageHoldTime(buyTransactions, sellTransactions),
            mostActiveToken: this.getMostActiveToken(transactions.transactions),
            firstTransactionDate: transactions.transactions.length > 0
              ? transactions.transactions[transactions.transactions.length - 1].createdAt
              : null,
            lastTransactionDate: transactions.transactions.length > 0
              ? transactions.transactions[0].createdAt
              : null
          },
          portfolio: portfolioSummary
        }
      });
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      next(error);
    }
  }

  // Helper method to calculate portfolio summary
  private async calculatePortfolioSummary(walletAddress: string): Promise<PortfolioSummary> {
    const portfolioItems = await databaseService.prisma.portfolio.findMany({
      where: { userAddress: walletAddress },
      include: {
        token: {
          select: {
            address: true,
            name: true,
            symbol: true,
            imageUrl: true,
            currentPrice: true
          }
        }
      }
    });

    const totalValue = portfolioItems.reduce((sum, item) =>
      sum + parseFloat(item.currentValue || '0'), 0
    );

    const totalInvested = portfolioItems.reduce((sum, item) =>
      sum + parseFloat(item.totalInvested || '0'), 0
    );

    const totalPnl = totalValue - totalInvested;
    const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Get top holdings (top 5 by value)
    const topHoldings = portfolioItems
      .map(item => {
        const currentValue = parseFloat(item.currentValue || '0');
        const totalInvested = parseFloat(item.totalInvested || '0');
        const pnl = currentValue - totalInvested;
        const pnlPercentage = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

        return {
          tokenAddress: item.tokenAddress,
          tokenName: item.token?.name || 'Unknown',
          tokenSymbol: item.token?.symbol || 'UNKNOWN',
          tokenLogo: item.token?.imageUrl,
          balance: item.tokenAmount,
          averageBuyPrice: item.averageBuyPrice,
          totalInvested: item.totalInvested,
          currentValue: item.currentValue,
          pnl: pnl.toString(),
          pnlPercentage: pnlPercentage.toFixed(2),
          holdings: 0
        };
      })
      .sort((a, b) => parseFloat(b.currentValue) - parseFloat(a.currentValue))
      .slice(0, 5);

    return {
      totalValue: totalValue.toString(),
      totalInvested: totalInvested.toString(),
      totalPnl: totalPnl.toString(),
      totalPnlPercentage: totalPnlPercentage.toFixed(2),
      tokensCount: portfolioItems.length,
      topHoldings
    };
  }

  // Helper method to calculate average hold time
  private calculateAverageHoldTime(buys: any[], sells: any[]): string {
    // This is a simplified calculation
    // In a real implementation, you'd need to match specific buys with sells
    const totalTransactions = buys.length + sells.length;
    if (totalTransactions === 0) return '0';

    // Return in days
    return '7'; // Placeholder - would need actual calculation
  }

  // Helper method to get most active token
  private getMostActiveToken(transactions: any[]): string | null {
    if (transactions.length === 0) return null;

    const tokenCounts = transactions.reduce((acc, tx) => {
      acc[tx.tokenAddress] = (acc[tx.tokenAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActive = Object.entries(tokenCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return mostActive ? mostActive[0] : null;
  }
}

export const portfolioController = new PortfolioController();