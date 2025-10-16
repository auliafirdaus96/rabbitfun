/**
 * Test Setup Configuration
 * Global test setup for RabbitFun Launchpad
 */

import '@testing-library/jest-dom';

// Setup MSW server (disabled for now)
// import { server } from './mocks/server';

// beforeAll(() => {
//   server.listen({
//     onUnhandledRequest: 'warn',
//   });
// });

// afterEach(() => {
//   server.resetHandlers();
// });

// afterAll(() => {
//   server.close();
// });

// Mock IntersectionObserver
(global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Web3 provider
(global as any).ethereum = {
  request: jest.fn(),
  isMetaMask: true,
  isConnected: true,
  _state: {
    accounts: ['0x0000000000000000000000000000000000000000'],
    chainId: '0x38',
  },
  on: jest.fn(),
  removeListener: jest.fn(),
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
(global as any).fetch = jest.fn();

// Mock WebSocket
(global as any).WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
}));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
  },
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock focus and blur
HTMLElement.prototype.focus = jest.fn();
HTMLElement.prototype.blur = jest.fn();

// Mock getComputedStyle
(global as any).getComputedStyle = jest.fn(() => ({
  getPropertyValue: () => '',
}));

// Global test utilities
export const createMockToken = (overrides: any = {}) => ({
  id: '1',
  name: 'Test Token',
  ticker: 'TEST',
  description: 'Test token description',
  imageUrl: 'https://example.com/image.png',
  contractAddress: '0x0000000000000000000000000000000000000000',
  creatorAddress: '0x0000000000000000000000000000000000000000',
  marketCap: '1000',
  progress: 50,
  holders: 100,
  priceChange: 10,
  createdAt: new Date().toISOString(),
  isGraduated: false,
  ...overrides,
});

export const createMockUser = (overrides: any = {}) => ({
  address: '0x0000000000000000000000000000000000000000',
  connected: true,
  chainId: 56,
  ...overrides,
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});