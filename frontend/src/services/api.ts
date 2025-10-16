import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';
import type {
  ApiResponse,
  TokenInfo,
  CreateTokenData,
  TokenListResponse,
  BondingCurveConfig,
  PriceCalculation,
  BondingCurveState,
  Transaction,
  TransactionHistory,
  UserProfile,
  UserPortfolio,
  MarketStats,
  TokenAnalytics,
  GlobalAnalytics,
  SearchParams,
  FilterOptions,
  PaginationParams,
  PaginatedResponse,
  ApiError
} from '@/types/api';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError<ApiError>) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  // Error handling
  private handleError(error: AxiosError<ApiError>): void {
    const defaultMessage = 'An unexpected error occurred';

    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || defaultMessage;

      switch (status) {
        case 400:
          toast.error(`Bad Request: ${message}`);
          break;
        case 401:
          toast.error('Unauthorized: Please log in again');
          // Clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Forbidden: You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Not Found: The requested resource was not found');
          break;
        case 429:
          toast.error('Too Many Requests: Please try again later');
          break;
        case 500:
          toast.error('Server Error: Please try again later');
          break;
        default:
          toast.error(`Error ${status}: ${message}`);
      }
    } else if (error.request) {
      toast.error('Network Error: Unable to connect to the server');
    } else {
      toast.error(`Request Error: ${error.message}`);
    }

    // Log error for debugging
    console.error('API Error:', error);
  }

  // Generic request methods
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    params?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Token Management API
  async getTokens(params?: SearchParams & PaginationParams): Promise<ApiResponse<TokenListResponse>> {
    return this.request<TokenListResponse>('GET', '/api/tokens', undefined, params);
  }

  async getTokenInfo(tokenAddress: string): Promise<ApiResponse<TokenInfo>> {
    return this.request<TokenInfo>('GET', `/api/tokens/${tokenAddress}`);
  }

  async createToken(tokenData: CreateTokenData): Promise<ApiResponse<TokenInfo>> {
    return this.request<TokenInfo>('POST', '/api/tokens', tokenData);
  }

  async getTokenAnalytics(tokenAddress: string): Promise<ApiResponse<TokenAnalytics>> {
    return this.request<TokenAnalytics>('GET', `/api/tokens/${tokenAddress}/analytics`);
  }

  async searchTokens(query: string, params?: SearchParams & PaginationParams): Promise<ApiResponse<TokenListResponse>> {
    return this.request<TokenListResponse>('GET', '/api/tokens/search', undefined, { query, ...params });
  }

  async getTrendingTokens(): Promise<ApiResponse<TokenInfo[]>> {
    return this.request<TokenInfo[]>('GET', '/api/tokens/trending');
  }

  async getRecentTokens(): Promise<ApiResponse<TokenInfo[]>> {
    return this.request<TokenInfo[]>('GET', '/api/tokens/recent');
  }

  // Bonding Curve API
  async getBondingCurveConfig(): Promise<ApiResponse<BondingCurveConfig>> {
    return this.request<BondingCurveConfig>('GET', '/api/bonding-curve/config');
  }

  async calculatePrice(supply: number): Promise<ApiResponse<{ price: number }>> {
    return this.request<{ price: number }>('GET', '/api/bonding-curve/price', undefined, { supply });
  }

  async calculateTokensOut(bnbAmount: number, currentSupply: number): Promise<ApiResponse<{ tokens: number }>> {
    return this.request<{ tokens: number }>('GET', '/api/bonding-curve/tokens-out', undefined, {
      bnbAmount,
      currentSupply,
    });
  }

  async calculateBNBOut(tokenAmount: number, currentSupply: number): Promise<ApiResponse<{ bnb: number }>> {
    return this.request<{ bnb: number }>('GET', '/api/bonding-curve/bnb-out', undefined, {
      tokenAmount,
      currentSupply,
    });
  }

  async calculatePriceImpact(amountIn: number, currentSupply: number): Promise<ApiResponse<{ impact: number }>> {
    return this.request<{ impact: number }>('GET', '/api/bonding-curve/price-impact', undefined, {
      amountIn,
      currentSupply,
    });
  }

  async getBondingCurveState(raisedAmount: number, currentSupply: number): Promise<ApiResponse<BondingCurveState>> {
    return this.request<BondingCurveState>('GET', '/api/bonding-curve/state', undefined, {
      raisedAmount,
      currentSupply,
    });
  }

  // Transaction API
  async getTransactionHistory(
    userAddress?: string,
    params?: PaginationParams
  ): Promise<ApiResponse<TransactionHistory>> {
    return this.request<TransactionHistory>('GET', '/api/transactions', undefined, {
      userAddress,
      ...params,
    });
  }

  async getTransactionDetails(txHash: string): Promise<ApiResponse<Transaction>> {
    return this.request<Transaction>('GET', `/api/transactions/${txHash}`);
  }

  async getTokenTransactions(
    tokenAddress: string,
    params?: PaginationParams
  ): Promise<ApiResponse<TransactionHistory>> {
    return this.request<TransactionHistory>('GET', `/api/tokens/${tokenAddress}/transactions`, undefined, params);
  }

  // User Management API
  async getUserProfile(address: string): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('GET', `/api/users/${address}`);
  }

  async updateUserProfile(address: string, data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('PUT', `/api/users/${address}`, data);
  }

  async getUserPortfolio(address: string): Promise<ApiResponse<UserPortfolio>> {
    return this.request<UserPortfolio>('GET', `/api/users/${address}/portfolio`);
  }

  async getUserFavorites(address: string): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('GET', `/api/users/${address}/favorites`);
  }

  async addToFavorites(address: string, tokenAddress: string): Promise<ApiResponse<void>> {
    return this.request<void>('POST', `/api/users/${address}/favorites`, { tokenAddress });
  }

  async removeFromFavorites(address: string, tokenAddress: string): Promise<ApiResponse<void>> {
    return this.request<void>('DELETE', `/api/users/${address}/favorites/${tokenAddress}`);
  }

  // Market Data API
  async getMarketStats(): Promise<ApiResponse<MarketStats>> {
    return this.request<MarketStats>('GET', '/api/market/stats');
  }

  async getGlobalAnalytics(): Promise<ApiResponse<GlobalAnalytics>> {
    return this.request<GlobalAnalytics>('GET', '/api/analytics/global');
  }

  async getTopGainers(limit?: number): Promise<ApiResponse<TokenInfo[]>> {
    return this.request<TokenInfo[]>('GET', '/api/market/top-gainers', undefined, { limit });
  }

  async getTopLosers(limit?: number): Promise<ApiResponse<TokenInfo[]>> {
    return this.request<TokenInfo[]>('GET', '/api/market/top-losers', undefined, { limit });
  }

  async getTopVolume(limit?: number): Promise<ApiResponse<TokenInfo[]>> {
    return this.request<TokenInfo[]>('GET', '/api/market/top-volume', undefined, { limit });
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('GET', '/api/health');
  }

  // Rate Limit Status
  async getRateLimitStatus(): Promise<ApiResponse<{
    remaining: number;
    resetTime: number;
    limit: number;
  }>> {
    return this.request<{
      remaining: number;
      resetTime: number;
      limit: number;
    }>('GET', '/api/rate-limit');
  }

  // WebSocket Token (for WebSocket connection)
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; expiresAt: number }>> {
    return this.request<{ token: string; expiresAt: number }>('GET', '/api/websocket/token');
  }

  // Contract Interaction Support
  async getContractInfo(): Promise<ApiResponse<{
    launchpadAddress: string;
    networkId: number;
    networkName: string;
    blockExplorer: string;
  }>> {
    return this.request<{
      launchpadAddress: string;
      networkId: number;
      networkName: string;
      blockExplorer: string;
    }>('GET', '/api/contract/info');
  }

  // Price Data (for external APIs)
  async getTokenPrice(tokenAddress: string): Promise<ApiResponse<{
    priceInBNB: number;
    priceInUSD: number;
    priceChange24h: number;
    marketCap: number;
    volume24h: number;
  }>> {
    return this.request<{
      priceInBNB: number;
      priceInUSD: number;
      priceChange24h: number;
      marketCap: number;
      volume24h: number;
    }>('GET', `/api/tokens/${tokenAddress}/price`);
  }

  // Notification preferences
  async getNotificationSettings(address: string): Promise<ApiResponse<{
    emailNotifications: boolean;
    priceAlerts: boolean;
    transactionAlerts: boolean;
    marketingEmails: boolean;
  }>> {
    return this.request<{
      emailNotifications: boolean;
      priceAlerts: boolean;
      transactionAlerts: boolean;
      marketingEmails: boolean;
    }>('GET', `/api/users/${address}/notifications`);
  }

  async updateNotificationSettings(
    address: string,
    settings: {
      emailNotifications?: boolean;
      priceAlerts?: boolean;
      transactionAlerts?: boolean;
      marketingEmails?: boolean;
    }
  ): Promise<ApiResponse<void>> {
    return this.request<void>('PUT', `/api/users/${address}/notifications`, settings);
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export class for testing purposes
export { ApiService };

// Export convenience methods
export const api = {
  // Token Management
  getTokens: apiService.getTokens.bind(apiService),
  getTokenInfo: apiService.getTokenInfo.bind(apiService),
  createToken: apiService.createToken.bind(apiService),
  getTokenAnalytics: apiService.getTokenAnalytics.bind(apiService),
  searchTokens: apiService.searchTokens.bind(apiService),
  getTrendingTokens: apiService.getTrendingTokens.bind(apiService),
  getRecentTokens: apiService.getRecentTokens.bind(apiService),

  // Bonding Curve
  getBondingCurveConfig: apiService.getBondingCurveConfig.bind(apiService),
  calculatePrice: apiService.calculatePrice.bind(apiService),
  calculateTokensOut: apiService.calculateTokensOut.bind(apiService),
  calculateBNBOut: apiService.calculateBNBOut.bind(apiService),
  calculatePriceImpact: apiService.calculatePriceImpact.bind(apiService),
  getBondingCurveState: apiService.getBondingCurveState.bind(apiService),

  // Transactions
  getTransactionHistory: apiService.getTransactionHistory.bind(apiService),
  getTransactionDetails: apiService.getTransactionDetails.bind(apiService),
  getTokenTransactions: apiService.getTokenTransactions.bind(apiService),

  // User Management
  getUserProfile: apiService.getUserProfile.bind(apiService),
  updateUserProfile: apiService.updateUserProfile.bind(apiService),
  getUserPortfolio: apiService.getUserPortfolio.bind(apiService),
  getUserFavorites: apiService.getUserFavorites.bind(apiService),
  addToFavorites: apiService.addToFavorites.bind(apiService),
  removeFromFavorites: apiService.removeFromFavorites.bind(apiService),

  // Market Data
  getMarketStats: apiService.getMarketStats.bind(apiService),
  getGlobalAnalytics: apiService.getGlobalAnalytics.bind(apiService),
  getTopGainers: apiService.getTopGainers.bind(apiService),
  getTopLosers: apiService.getTopLosers.bind(apiService),
  getTopVolume: apiService.getTopVolume.bind(apiService),

  // Contract Info
  getContractInfo: apiService.getContractInfo.bind(apiService),
  getTokenPrice: apiService.getTokenPrice.bind(apiService),

  // Health & Status
  healthCheck: apiService.healthCheck.bind(apiService),
  getRateLimitStatus: apiService.getRateLimitStatus.bind(apiService),
  getWebSocketToken: apiService.getWebSocketToken.bind(apiService),

  // Notifications
  getNotificationSettings: apiService.getNotificationSettings.bind(apiService),
  updateNotificationSettings: apiService.updateNotificationSettings.bind(apiService),
};

export default apiService;