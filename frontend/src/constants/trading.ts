// Trading and price-related constants

export const TRADING_CONSTANTS = {
  // Initial price for dynamic pricing
  INITIAL_PRICE: 0.0899717,

  // Mock trades data
  MOCK_TRADES_COUNT: 82,
  MOCK_TRADE_MAX_AMOUNT: 0.1,
  MOCK_TRADE_MIN_AMOUNT: 0.001,
  MOCK_TOKEN_AMOUNT_MULTIPLIER: 1000,

  // Trade timing (milliseconds)
  TRADE_INTERVAL_MS: 1000 * 60 * 3, // 3 minutes

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_VISIBLE_TRADES: 50,

  // Price calculation
  PRICE_IMPACT_FACTOR: 0.05,
  MAX_PRICE_IMPACT: 0.1,
  SLIPPAGE_BUFFER: 0.01,

  // Trading limits
  MAX_TRADE_AMOUNT_BNB: 1000,
  MIN_TRADE_AMOUNT_BNB: 0.001,
  MAX_SLIPPAGE_PERCENT: 50,
  MIN_SLIPPAGE_PERCENT: 0.1,

  // Bonding curve
  DEFAULT_LIQUIDITY_BNB: 391.49,
  BONDING_CURVE_PROGRESS: 31.07,

  // Rate limiting
  WALLET_CONNECTION_LIMIT: 3,
  TRADE_RATE_LIMIT: 10,
  API_REQUEST_LIMIT: 30,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Retry mechanism
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF_BASE: 2,

  // MEV protection
  MEV_PROTECTION_ENABLED: true,
} as const;

export const UI_CONSTANTS = {
  // Animation durations (ms)
  ANIMATION_DURATION: 300,
  FADE_IN_DURATION: 500,
  SPINNER_DURATION: 1000,

  // Delays for preloading
  ROUTE_PRELOAD_DELAY: 2000,
  HOVER_PRELOAD_DELAY: 100,

  // Chart dimensions
  CHART_HEIGHT_MOBILE: 360,
  CHART_HEIGHT_DESKTOP: 460,
  CHART_ASPECT_RATIO: 16 / 9,

  // Tab content min height
  TAB_CONTENT_MIN_HEIGHT: 600,

  // Loading skeleton dimensions
  LOADING_SKELETON_HEIGHT: 40,
  SIDEBAR_LOADING_HEIGHT: 128,

  // Toast notifications
  TOAST_DURATION_SHORT: 3000,
  TOAST_DURATION_LONG: 5000,
  TOAST_DURATION_SUCCESS: 2000,

  // Number formatting
  DEFAULT_DECIMAL_PLACES: 2,
  CRYPTO_DECIMAL_PLACES: 6,
  PERCENTAGE_DECIMAL_PLACES: 2,
  LARGE_NUMBER_THRESHOLD: 1000000,
  COMPACT_NUMBER_THRESHOLD: 1000,

  // Input validation
  MAX_AMOUNT_INPUT_LENGTH: 50,
  MAX_SLIPPAGE_INPUT_LENGTH: 5,
  MAX_DECIMAL_PLACES_CRYPTO: 18,

  // Performance monitoring
  METRICS_LOG_INTERVAL: 30000, // 30 seconds in development
  PERFORMANCE_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  CACHE_MAX_SIZE: 100,

  // Breakpoints
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1280,
} as const;

export const DATA_CONSTANTS = {
  // Holder data
  HOLDERS_LIST_LENGTH: 20,
  LIQUIDITY_POOL_PERCENT: 41.63,
  TOP_HOLDERS_COUNT: 10,

  // Mock holder distribution
  HOLDERS: [
    { label: "Liquidity pool", percent: 41.63, kind: "lp" as const },
    { label: "31VA...JGV3", percent: 10.69 },
    { label: "DbT7...edMEq", percent: 4.83 },
    { label: "6J5Q...BVJX", percent: 3.16 },
    { label: "u6MC...LnCb", percent: 3.03 },
    { label: "GWCD...zbum", percent: 3.02 },
    { label: "9NTr...nSNa", percent: 2.65 },
    { label: "4UVR...iPgx", percent: 2.09 },
    { label: "DjpQ...rBdT", percent: 1.93 },
    { label: "HHhz...gpex", percent: 1.92 },
    { label: "E71A...RA7w", percent: 1.78 },
    { label: "AzVy...DzYF", percent: 1.43 },
    { label: "GJPC...zoCk", percent: 1.34 },
    { label: "AkP9...Hf8D", percent: 1.27 },
    { label: "5FGk...DiCd", percent: 1.11 },
    { label: "AeF7...xFGe", percent: 0.95 },
    { label: "56S2...q7G3", percent: 0.94 },
    { label: "5Kfm...kjwb", percent: 0.87 },
    { label: "8zkg...sNZJ", percent: 0.86 },
    { label: "7BNa...LGH5", percent: 0.76 },
  ] as const,

  // Mock wallet data
  MOCK_WALLET_BALANCE_BNB: 5.2,
  MOCK_WALLET_BALANCE_TOKEN: 125000,

  // Trade presets
  TRADE_PRESETS: ["0.1", "0.5", "1", "MAX"] as const,

  // Slippage presets
  SLIPPAGE_PRESETS: [0.5, 1, 3] as const,
  DEFAULT_SLIPPAGE: 1,
} as const;

export const NETWORK_CONSTANTS = {
  // Chain IDs
  BSC_CHAIN_ID: "0x38",
  BSC_TESTNET_CHAIN_ID: "0x61",
  ETH_CHAIN_ID: "0x1",

  // Network configuration
  BSC_MAINNET: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed1.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },

  // RPC URLs
  BSC_RPC_URL: "https://bsc-dataseed1.binance.org",
  BSC_RPC_BACKUP: ["https://bsc-dataseed2.binance.org", "https://bsc-dataseed3.binance.org"],

  // Gas settings
  DEFAULT_GAS_LIMIT: 21000,
  TOKEN_TRANSFER_GAS_LIMIT: 100000,
  SWAP_GAS_LIMIT: 200000,

  // Transaction timeouts
  TRANSACTION_TIMEOUT_MS: 60000, // 1 minute
  WALLET_CONNECTION_TIMEOUT: 10000, // 10 seconds
} as const;

export const ERROR_CONSTANTS = {
  // Error codes
  ERROR_CODES: {
    USER_REJECTED: 4001,
    UNAUTHORIZED: 4100,
    UNSUPPORTED_METHOD: 4200,
    CHAIN_DISCONNECTED: 4900,
    CHAIN_NOT_ADDED: 4902,
    SWITCH_CHAIN: 4903,
  },

  // Error messages
  WALLET_NOT_DETECTED: "MetaMask tidak terdeteksi",
  TRANSACTION_FAILED: "Transaksi gagal",
  INSUFFICIENT_FUNDS: "Saldo tidak mencukupi",
  NETWORK_ERROR: "Kesalahan jaringan. Silakan coba lagi.",
  USER_REJECTED: "Transaksi ditolak oleh pengguna",
  INVALID_AMOUNT: "Jumlah tidak valid",
  INVALID_SLIPPAGE: "Slippage tidak valid",
  WALLET_CONNECTION_FAILED: "Gagal menghubungkan wallet",
  CHAIN_SWITCH_FAILED: "Gagal berpindah jaringan",
} as const;

// Utility functions for constants
export const getDelayMs = (attempt: number): number => {
  return TRADING_CONSTANTS.RETRY_DELAY_MS * Math.pow(TRADING_CONSTANTS.EXPONENTIAL_BACKOFF_BASE, attempt);
};

export const formatAmount = (amount: number, decimals: number = UI_CONSTANTS.DEFAULT_DECIMAL_PLACES): string => {
  return amount.toFixed(decimals);
};

export const isValidAmount = (amount: number): boolean => {
  return amount >= TRADING_CONSTANTS.MIN_TRADE_AMOUNT_BNB &&
         amount <= TRADING_CONSTANTS.MAX_TRADE_AMOUNT_BNB &&
         !Number.isNaN(amount);
};

export const isValidSlippage = (slippage: number): boolean => {
  return slippage >= TRADING_CONSTANTS.MIN_SLIPPAGE_PERCENT &&
         slippage <= TRADING_CONSTANTS.MAX_SLIPPAGE_PERCENT &&
         !Number.isNaN(slippage);
};