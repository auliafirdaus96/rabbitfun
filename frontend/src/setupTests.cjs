/**
 * Test Setup Configuration (CommonJS)
 * Global test setup for RabbitFun Launchpad
 */

require('@testing-library/jest-dom');

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Web3 provider
global.ethereum = {
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
  let store = {};

  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
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
  let store = {};

  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
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
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
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
global.getComputedStyle = jest.fn(() => ({
  getPropertyValue: () => '',
}));

// Global test utilities
global.createMockToken = (overrides = {}) => ({
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

global.createMockUser = (overrides = {}) => ({
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