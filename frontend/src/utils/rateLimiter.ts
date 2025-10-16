// Rate limiting utilities for preventing abuse

interface RateLimitEntry {
  timestamp: number;
  attempts: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  // Check if an identifier is rate limited
  isRateLimited(identifier: string): { limited: boolean; remainingAttempts: number; resetTime: number } {
    const now = Date.now();
    const entry = this.entries.get(identifier);

    if (!entry) {
      this.entries.set(identifier, { timestamp: now, attempts: 1 });
      return { limited: false, remainingAttempts: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }

    // Check if the window has expired
    if (now - entry.timestamp > this.windowMs) {
      this.entries.set(identifier, { timestamp: now, attempts: 1 });
      return { limited: false, remainingAttempts: this.maxAttempts - 1, resetTime: now + this.windowMs };
    }

    // Increment attempts
    entry.attempts++;

    // Check if rate limit exceeded
    if (entry.attempts > this.maxAttempts) {
      return {
        limited: true,
        remainingAttempts: 0,
        resetTime: entry.timestamp + this.windowMs
      };
    }

    return {
      limited: false,
      remainingAttempts: this.maxAttempts - entry.attempts,
      resetTime: entry.timestamp + this.windowMs
    };
  }

  // Reset rate limit for an identifier
  reset(identifier: string): void {
    this.entries.delete(identifier);
  }

  // Clear all entries (useful for testing)
  clear(): void {
    this.entries.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now - entry.timestamp > this.windowMs) {
        this.entries.delete(key);
      }
    }
  }
}

// Specific rate limiters for different operations
export const walletConnectionLimiter = new RateLimiter(3, 60000); // 3 attempts per minute
export const tradingLimiter = new RateLimiter(10, 60000); // 10 trades per minute
export const apiRequestLimiter = new RateLimiter(30, 60000); // 30 API requests per minute

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  walletConnectionLimiter.cleanup();
  tradingLimiter.cleanup();
  apiRequestLimiter.cleanup();
}, 5 * 60 * 1000);

// Hook for rate limiting wallet connections
export const useWalletRateLimit = () => {
  const checkConnectionLimit = (walletAddress: string) => {
    const result = walletConnectionLimiter.isRateLimited(walletAddress);

    if (result.limited) {
      const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);
      return {
        allowed: false,
        error: `Too many connection attempts. Please wait ${waitTime} seconds.`,
        resetTime: result.resetTime,
        remainingAttempts: result.remainingAttempts
      };
    }

    return {
      allowed: true,
      remainingAttempts: result.remainingAttempts,
      resetTime: result.resetTime
    };
  };

  const resetConnectionLimit = (walletAddress: string) => {
    walletConnectionLimiter.reset(walletAddress);
  };

  return {
    checkConnectionLimit,
    resetConnectionLimit
  };
};

// Hook for rate limiting trades
export const useTradeRateLimit = () => {
  const checkTradeLimit = (walletAddress: string) => {
    const result = tradingLimiter.isRateLimited(walletAddress);

    if (result.limited) {
      const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);
      return {
        allowed: false,
        error: `Too many trades. Please wait ${waitTime} seconds.`,
        resetTime: result.resetTime,
        remainingAttempts: result.remainingAttempts
      };
    }

    return {
      allowed: true,
      remainingAttempts: result.remainingAttempts,
      resetTime: result.resetTime
    };
  };

  const resetTradeLimit = (walletAddress: string) => {
    tradingLimiter.reset(walletAddress);
  };

  return {
    checkTradeLimit,
    resetTradeLimit
  };
};

// Global rate limiter for API requests
export const checkApiRateLimit = (endpoint: string) => {
  const result = apiRequestLimiter.isRateLimited(endpoint);

  if (result.limited) {
    const waitTime = Math.ceil((result.resetTime - Date.now()) / 1000);
    return {
      allowed: false,
      error: `Rate limit exceeded. Please wait ${waitTime} seconds.`,
      resetTime: result.resetTime,
      remainingAttempts: result.remainingAttempts
    };
  }

  return {
    allowed: true,
    remainingAttempts: result.remainingAttempts,
    resetTime: result.resetTime
  };
};