import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(private callback: IntersectionObserverCallback, private options?: IntersectionObserverInit) {}

  observe(target: Element) {
    // Simulate intersection immediately for tests
    setTimeout(() => {
      this.callback([{ target, isIntersecting: true }], this);
    }, 0);
  }

  unobserve(target: Element) {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }

  root = null;
  rootMargin = '0px';
  thresholds = [0];
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element, options?: ResizeObserverOptions) {
    // Mock implementation
  }

  unobserve(target: Element) {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getPropertyValue: jest.fn().mockReturnValue(''),
  })),
});

// Mock Image constructor for testing lazy loading
global.Image = class Image {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  width: number = 0;
  height: number = 0;

  constructor() {
    // Simulate loading after a short delay
    setTimeout(() => {
      if (this.src && this.onload) {
        this.onload();
      }
    }, 100);
  }

  addEventListener(event: string, handler: EventListener) {
    if (event === 'load') {
      this.onload = handler as () => void;
    } else if (event === 'error') {
      this.onerror = handler as () => void;
    }
  }

  removeEventListener(event: string, handler: EventListener) {
    if (event === 'load' && this.onload === handler) {
      this.onload = null;
    } else if (event === 'error' && this.onerror === handler) {
      this.onerror = null;
    }
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress specific console errors in tests
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: An invalid form control') ||
       args[0].includes('act(...) is not supported'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Setup MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset request handlers after each test
afterEach(() => {
  server.resetHandlers();
  localStorageMock.clear();
  sessionStorageMock.clear();
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock timers for consistent testing
jest.useFakeTimers();

// Helper functions for tests
export const createMockToken = (overrides: Partial<any> = {}) => ({
  id: '1',
  name: 'Test Token',
  ticker: 'TEST',
  contractAddress: '0x1234567890123456789012345678901234567890',
  contract: '0x1234567890123456789012345678901234567890',
  marketCap: '50000',
  priceChange: 10,
  creatorName: 'Test Creator',
  created_at: '2024-01-01T00:00:00.000Z',
  progress: 25,
  description: 'Test token description',
  volume: '5000',
  holders: 100,
  price: '0.001',
  liquidity: '10000',
  ...overrides,
});

export const createMockUser = (overrides: Partial<any> = {}) => ({
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  chainId: 97,
  balance: '1.5',
  ...overrides,
});

export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockEthereumProvider = {
  request: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeListener: jest.fn(),
};

export const setupEthereumMock = () => {
  Object.defineProperty(window, 'ethereum', {
    value: mockEthereumProvider,
    writable: true,
  });

  return mockEthereumProvider;
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: Record<string, string>): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | number): R;
      toBeChecked(): R;
      toHaveFocus(): R;
    }
  }
}

// Export setup for use in other test files
export {
  localStorageMock,
  sessionStorageMock,
  mockEthereumProvider,
};