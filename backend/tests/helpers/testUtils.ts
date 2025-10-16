import request from 'supertest';
import { app } from '../../src/server';

/**
 * Helper function to make authenticated requests
 * TODO: Implement proper authentication when available
 */
export const authenticatedRequest = (token?: string) => {
  return request(app).set('Authorization', token ? `Bearer ${token}` : '');
};

/**
 * Helper function to generate valid Ethereum address for testing
 */
export const generateValidAddress = (): string => {
  return '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
};

/**
 * Helper function to generate valid transaction hash for testing
 */
export const generateValidTxHash = (): string => {
  return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
};

/**
 * Helper function to create valid token data for testing
 */
export const createValidTokenData = (overrides: Partial<any> = {}) => {
  return {
    name: 'Test Token',
    symbol: 'TEST',
    metadata: 'https://example.com/metadata.json',
    ...overrides
  };
};

/**
 * Helper function to create valid buy token data for testing
 */
export const createValidBuyData = (overrides: Partial<any> = {}) => {
  return {
    bnbAmount: '0.1',
    minTokensOut: '100',
    ...overrides
  };
};

/**
 * Helper function to create valid sell token data for testing
 */
export const createValidSellData = (overrides: Partial<any> = {}) => {
  return {
    tokenAmount: '100',
    minBNBOut: '0.05',
    ...overrides
  };
};

/**
 * Helper function to validate API response structure
 */
export const expectValidApiResponse = (response: any, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success');
  expect(response.body).toHaveProperty('data');
};

/**
 * Helper function to validate error response structure
 */
export const expectValidErrorResponse = (response: any, expectedStatus: number = 400) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
};

/**
 * Mock data for testing
 */
export const mockData = {
  validAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  invalidAddress: 'invalid-address',
  validTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  invalidTxHash: 'invalid-hash',
  tokenData: {
    name: 'Test Token',
    symbol: 'TEST',
    metadata: 'https://example.com/metadata.json'
  },
  buyData: {
    bnbAmount: '0.1',
    minTokensOut: '100'
  },
  sellData: {
    tokenAmount: '100',
    minBNBOut: '0.05'
  }
};