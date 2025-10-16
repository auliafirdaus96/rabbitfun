/**
 * Environment Configuration Manager
 * Secure environment variable management for RabbitFun Launchpad
 */

interface EnvironmentConfig {
  // API Configuration
  apiBaseUrl: string;
  apiVersion: string;
  wsUrl: string;
  wsReconnectAttempts: number;
  wsReconnectDelay: number;

  // Blockchain Configuration
  blockchainNetwork: string;
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  bondingCurveAddress: string;
  tokenFactoryAddress: string;
  routerAddress: string;

  // Application Configuration
  appName: string;
  appVersion: string;
  appDescription: string;
  appUrl: string;

  // Feature Flags
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  enableSocialFeatures: boolean;
  enableAdvancedSearch: boolean;
  enableNotifications: boolean;
  enableDevTools: boolean;
  enableMockData: boolean;
  enableDebugLogs: boolean;

  // Security Configuration
  corsOrigin: string;
  corsCredentials: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  cspEnabled: boolean;
  cspScriptSrc: string;
  cspStyleSrc: string;
  cspImgSrc: string;
  cspConnectSrc: string;

  // Performance Configuration
  cacheEnabled: boolean;
  cacheTtl: number;
  cacheMaxSize: number;
  lazyLoadingEnabled: boolean;
  lazyLoadingThreshold: number;
  placeholderBlur: boolean;
  imageOptimization: boolean;
  imageQuality: number;
  imagePlaceholder: boolean;

  // Third-party Services
  walletConnectProjectId: string;
  metaMaskDeepLink: string;
  ipfsGateway: string;
  ipfsBackupGateway: string;
  twitterHandle: string;
  telegramGroup: string;
  discordInvite: string;

  // UI/UX Configuration
  defaultTheme: string;
  themePersistence: boolean;
  animationDuration: number;
  paginationDefaultSize: number;
  paginationMaxSize: number;
  searchDebounceDelay: number;
  searchMinLength: number;
  searchMaxResults: number;
  notificationDuration: number;
  notificationPosition: string;
  notificationMaxVisible: number;

  // Development & Debugging
  logLevel: string;
  logToConsole: boolean;
  logToFile: boolean;
  performanceMonitoring: boolean;
  devPerformanceSampleRate: number;
  enableBetaFeatures: boolean;
  enableExperimentalFeatures: boolean;

  // Production Specific
  buildSourceMap: boolean;
  buildMinify: boolean;
  buildTarget: string;
  securityHeadersEnabled: boolean;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;

  // Testing Configuration
  testMode: boolean;
  testNetwork: string;
  testPrivateKey: string;
  enableMockApi: boolean;
  mockApiDelay: number;
  mockErrorRate: number;
  e2eTesting: boolean;
  e2eHeadless: boolean;
  e2eTimeout: number;

  // Backup & Redundancy
  backupApiUrl: string;
  failoverEnabled: boolean;
  failoverTimeout: number;
  cdnEnabled: boolean;
  cdnUrl: string;
  cdnVersion: string;

  // Regional Configuration
  defaultRegion: string;
  enableRegionalFeatures: boolean;
  regionDetection: boolean;
  defaultCurrency: string;
  enableCurrencyConversion: boolean;
  currencyApiKey: string;
  defaultLanguage: string;
  enableMultilingual: boolean;
  supportedLanguages: string[];

  // Legal & Compliance
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  ageRestrictionEnabled: boolean;
  minimumAge: number;
  gdprCompliance: boolean;
  cookieConsentEnabled: boolean;
  dataRetentionDays: number;

  // Monitoring & Alerts
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
  healthCheckEndpoint: string;
  errorReportingEnabled: boolean;
  errorSampleRate: number;
  errorIncludeUserData: boolean;
  performanceAlertsEnabled: boolean;
  performanceThreshold: number;
  alertPerformanceSampleRate: number;

  // Deployment Configuration
  nodeEnv: string;
  deploymentEnv: string;
  buildTimestamp: boolean;
  deploymentVersion: string;
  deploymentCommitHash: string;
  deploymentBranch: string;
  cdnDeployment: boolean;
  cdnProvider: string;
  cdnRegion: string;

  // Emergency Controls
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceRedirectUrl: string;
  emergencyShutdown: boolean;
  emergencyMessage: string;
  emergencyContact: string;

  // Experimental Features
  enableBetaUi: boolean;
  enableBetaApi: boolean;
  enableBetaAnalytics: boolean;
  enableAiFeatures: boolean;
  aiModelVersion: string;
  aiEndpoint: string;
  enableWeb3Modal: boolean;
  enableNftFeatures: boolean;
  enableStaking: boolean;
}

/**
 * Validate environment variable
 */
const validateEnvVar = (key: string, value: string | undefined, required: boolean = true): string => {
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Required environment variable ${key} is missing or empty`);
  }
  return value || '';
};

/**
 * Parse boolean environment variable
 */
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Parse number environment variable
 */
const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse array environment variable
 */
const parseArray = (value: string | undefined, defaultValue: string[] = []): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Get environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  // Validate required environment variables
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_APP_NAME',
    'VITE_APP_VERSION'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    // API Configuration
    apiBaseUrl: validateEnvVar('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
    apiVersion: validateEnvVar('VITE_API_VERSION', import.meta.env.VITE_API_VERSION, false),
    wsUrl: validateEnvVar('VITE_WS_URL', import.meta.env.VITE_WS_URL, false),
    wsReconnectAttempts: parseNumber(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS, 5),
    wsReconnectDelay: parseNumber(import.meta.env.VITE_WS_RECONNECT_DELAY, 1000),

    // Blockchain Configuration
    blockchainNetwork: validateEnvVar('VITE_BLOCKCHAIN_NETWORK', import.meta.env.VITE_BLOCKCHAIN_NETWORK),
    chainId: parseNumber(import.meta.env.VITE_CHAIN_ID, 56),
    rpcUrl: validateEnvVar('VITE_RPC_URL', import.meta.env.VITE_RPC_URL),
    blockExplorerUrl: validateEnvVar('VITE_BLOCK_EXPLORER_URL', import.meta.env.VITE_BLOCK_EXPLORER_URL),
    bondingCurveAddress: validateEnvVar('VITE_BONDING_CURVE_ADDRESS', import.meta.env.VITE_BONDING_CURVE_ADDRESS),
    tokenFactoryAddress: validateEnvVar('VITE_TOKEN_FACTORY_ADDRESS', import.meta.env.VITE_TOKEN_FACTORY_ADDRESS),
    routerAddress: validateEnvVar('VITE_ROUTER_ADDRESS', import.meta.env.VITE_ROUTER_ADDRESS),

    // Application Configuration
    appName: validateEnvVar('VITE_APP_NAME', import.meta.env.VITE_APP_NAME),
    appVersion: validateEnvVar('VITE_APP_VERSION', import.meta.env.VITE_APP_VERSION),
    appDescription: validateEnvVar('VITE_APP_DESCRIPTION', import.meta.env.VITE_APP_DESCRIPTION, false),
    appUrl: validateEnvVar('VITE_APP_URL', import.meta.env.VITE_APP_URL, false),

    // Feature Flags
    enableAnalytics: parseBoolean(import.meta.env.VITE_ENABLE_ANALYTICS),
    enableErrorReporting: parseBoolean(import.meta.env.VITE_ENABLE_ERROR_REPORTING),
    enablePerformanceMonitoring: parseBoolean(import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING),
    enableSocialFeatures: parseBoolean(import.meta.env.VITE_ENABLE_SOCIAL_FEATURES),
    enableAdvancedSearch: parseBoolean(import.meta.env.VITE_ENABLE_ADVANCED_SEARCH),
    enableNotifications: parseBoolean(import.meta.env.VITE_ENABLE_NOTIFICATIONS),
    enableDevTools: parseBoolean(import.meta.env.VITE_ENABLE_DEV_TOOLS),
    enableMockData: parseBoolean(import.meta.env.VITE_ENABLE_MOCK_DATA),
    enableDebugLogs: parseBoolean(import.meta.env.VITE_ENABLE_DEBUG_LOGS),

    // Security Configuration
    corsOrigin: validateEnvVar('VITE_CORS_ORIGIN', import.meta.env.VITE_CORS_ORIGIN, false),
    corsCredentials: parseBoolean(import.meta.env.VITE_CORS_CREDENTIALS, true),
    rateLimitRequests: parseNumber(import.meta.env.VITE_RATE_LIMIT_REQUESTS, 100),
    rateLimitWindow: parseNumber(import.meta.env.VITE_RATE_LIMIT_WINDOW, 60000),
    cspEnabled: parseBoolean(import.meta.env.VITE_CSP_ENABLED, true),
    cspScriptSrc: validateEnvVar('VITE_CSP_SCRIPT_SRC', import.meta.env.VITE_CSP_SCRIPT_SRC, false),
    cspStyleSrc: validateEnvVar('VITE_CSP_STYLE_SRC', import.meta.env.VITE_CSP_STYLE_SRC, false),
    cspImgSrc: validateEnvVar('VITE_CSP_IMG_SRC', import.meta.env.VITE_CSP_IMG_SRC, false),
    cspConnectSrc: validateEnvVar('VITE_CSP_CONNECT_SRC', import.meta.env.VITE_CSP_CONNECT_SRC, false),

    // Performance Configuration
    cacheEnabled: parseBoolean(import.meta.env.VITE_CACHE_ENABLED, true),
    cacheTtl: parseNumber(import.meta.env.VITE_CACHE_TTL, 300000),
    cacheMaxSize: parseNumber(import.meta.env.VITE_CACHE_MAX_SIZE, 100),
    lazyLoadingEnabled: parseBoolean(import.meta.env.VITE_LAZY_LOADING_ENABLED, true),
    lazyLoadingThreshold: parseNumber(import.meta.env.VITE_LAZY_LOADING_THRESHOLD, 200),
    placeholderBlur: parseBoolean(import.meta.env.VITE_PLACEHOLDER_BLUR, true),
    imageOptimization: parseBoolean(import.meta.env.VITE_IMAGE_OPTIMIZATION, true),
    imageQuality: parseNumber(import.meta.env.VITE_IMAGE_QUALITY, 80),
    imagePlaceholder: parseBoolean(import.meta.env.VITE_IMAGE_PLACEHOLDER, true),

    // Third-party Services
    walletConnectProjectId: validateEnvVar('VITE_WALLETCONNECT_PROJECT_ID', import.meta.env.VITE_WALLETCONNECT_PROJECT_ID, false),
    metaMaskDeepLink: validateEnvVar('VITE_META_MASK_DEEPLINK', import.meta.env.VITE_META_MASK_DEEPLINK, false),
    ipfsGateway: validateEnvVar('VITE_IPFS_GATEWAY', import.meta.env.VITE_IPFS_GATEWAY, false),
    ipfsBackupGateway: validateEnvVar('VITE_IPFS_BACKUP_GATEWAY', import.meta.env.VITE_IPFS_BACKUP_GATEWAY, false),
    twitterHandle: validateEnvVar('VITE_TWITTER_HANDLE', import.meta.env.VITE_TWITTER_HANDLE, false),
    telegramGroup: validateEnvVar('VITE_TELEGRAM_GROUP', import.meta.env.VITE_TELEGRAM_GROUP, false),
    discordInvite: validateEnvVar('VITE_DISCORD_INVITE', import.meta.env.VITE_DISCORD_INVITE, false),

    // UI/UX Configuration
    defaultTheme: validateEnvVar('VITE_DEFAULT_THEME', import.meta.env.VITE_DEFAULT_THEME, false),
    themePersistence: parseBoolean(import.meta.env.VITE_THEME_PERSISTENCE, true),
    animationDuration: parseNumber(import.meta.env.VITE_ANIMATION_DURATION, 300),
    paginationDefaultSize: parseNumber(import.meta.env.VITE_PAGINATION_DEFAULT_SIZE, 20),
    paginationMaxSize: parseNumber(import.meta.env.VITE_PAGINATION_MAX_SIZE, 100),
    searchDebounceDelay: parseNumber(import.meta.env.VITE_SEARCH_DEBOUNCE_DELAY, 300),
    searchMinLength: parseNumber(import.meta.env.VITE_SEARCH_MIN_LENGTH, 2),
    searchMaxResults: parseNumber(import.meta.env.VITE_SEARCH_MAX_RESULTS, 50),
    notificationDuration: parseNumber(import.meta.env.VITE_NOTIFICATION_DURATION, 5000),
    notificationPosition: validateEnvVar('VITE_NOTIFICATION_POSITION', import.meta.env.VITE_NOTIFICATION_POSITION, false),
    notificationMaxVisible: parseNumber(import.meta.env.VITE_NOTIFICATION_MAX_VISIBLE, 5),

    // Development & Debugging
    logLevel: validateEnvVar('VITE_LOG_LEVEL', import.meta.env.VITE_LOG_LEVEL, false),
    logToConsole: parseBoolean(import.meta.env.VITE_LOG_TO_CONSOLE, false),
    logToFile: parseBoolean(import.meta.env.VITE_LOG_TO_FILE, false),
    performanceMonitoring: parseBoolean(import.meta.env.VITE_PERFORMANCE_MONITORING, false),
    devPerformanceSampleRate: parseNumber(import.meta.env.VITE_PERFORMANCE_SAMPLE_RATE, 0.1),
    enableBetaFeatures: parseBoolean(import.meta.env.VITE_ENABLE_BETA_FEATURES, false),
    enableExperimentalFeatures: parseBoolean(import.meta.env.VITE_ENABLE_EXPERIMENTAL_FEATURES, false),

    // Production Specific
    buildSourceMap: parseBoolean(import.meta.env.VITE_BUILD_SOURCEMAP, false),
    buildMinify: parseBoolean(import.meta.env.VITE_BUILD_MINIFY, true),
    buildTarget: validateEnvVar('VITE_BUILD_TARGET', import.meta.env.VITE_BUILD_TARGET, false),
    securityHeadersEnabled: parseBoolean(import.meta.env.VITE_SECURITY_HEADERS_ENABLED, true),
    xFrameOptions: validateEnvVar('VITE_X_FRAME_OPTIONS', import.meta.env.VITE_X_FRAME_OPTIONS, false),
    xContentTypeOptions: validateEnvVar('VITE_X_CONTENT_TYPE_OPTIONS', import.meta.env.VITE_X_CONTENT_TYPE_OPTIONS, false),
    referrerPolicy: validateEnvVar('VITE_REFERRER_POLICY', import.meta.env.VITE_REFERRER_POLICY, false),

    // Testing Configuration
    testMode: parseBoolean(import.meta.env.VITE_TEST_MODE, false),
    testNetwork: validateEnvVar('VITE_TEST_NETWORK', import.meta.env.VITE_TEST_NETWORK, false),
    testPrivateKey: validateEnvVar('VITE_TEST_PRIVATE_KEY', import.meta.env.VITE_TEST_PRIVATE_KEY, false),
    enableMockApi: parseBoolean(import.meta.env.VITE_ENABLE_MOCK_API, false),
    mockApiDelay: parseNumber(import.meta.env.VITE_MOCK_API_DELAY, 500),
    mockErrorRate: parseNumber(import.meta.env.VITE_MOCK_ERROR_RATE, 0),
    e2eTesting: parseBoolean(import.meta.env.VITE_E2E_TESTING, false),
    e2eHeadless: parseBoolean(import.meta.env.VITE_E2E_HEADLESS, true),
    e2eTimeout: parseNumber(import.meta.env.VITE_E2E_TIMEOUT, 10000),

    // Backup & Redundancy
    backupApiUrl: validateEnvVar('VITE_BACKUP_API_URL', import.meta.env.VITE_BACKUP_API_URL, false),
    failoverEnabled: parseBoolean(import.meta.env.VITE_FAILOVER_ENABLED, false),
    failoverTimeout: parseNumber(import.meta.env.VITE_FAILOVER_TIMEOUT, 5000),
    cdnEnabled: parseBoolean(import.meta.env.VITE_CDN_ENABLED, false),
    cdnUrl: validateEnvVar('VITE_CDN_URL', import.meta.env.VITE_CDN_URL, false),
    cdnVersion: validateEnvVar('VITE_CDN_VERSION', import.meta.env.VITE_CDN_VERSION, false),

    // Regional Configuration
    defaultRegion: validateEnvVar('VITE_DEFAULT_REGION', import.meta.env.VITE_DEFAULT_REGION, false),
    enableRegionalFeatures: parseBoolean(import.meta.env.VITE_ENABLE_REGIONAL_FEATURES, false),
    regionDetection: parseBoolean(import.meta.env.VITE_REGION_DETECTION, true),
    defaultCurrency: validateEnvVar('VITE_DEFAULT_CURRENCY', import.meta.env.VITE_DEFAULT_CURRENCY, false),
    enableCurrencyConversion: parseBoolean(import.meta.env.VITE_ENABLE_CURRENCY_CONVERSION, false),
    currencyApiKey: validateEnvVar('VITE_CURRENCY_API_KEY', import.meta.env.VITE_CURRENCY_API_KEY, false),
    defaultLanguage: validateEnvVar('VITE_DEFAULT_LANGUAGE', import.meta.env.VITE_DEFAULT_LANGUAGE, false),
    enableMultilingual: parseBoolean(import.meta.env.VITE_ENABLE_MULTILINGUAL, false),
    supportedLanguages: parseArray(import.meta.env.VITE_SUPPORTED_LANGUAGES, ['en']),

    // Legal & Compliance
    privacyPolicyUrl: validateEnvVar('VITE_PRIVACY_POLICY_URL', import.meta.env.VITE_PRIVACY_POLICY_URL, false),
    termsOfServiceUrl: validateEnvVar('VITE_TERMS_OF_SERVICE_URL', import.meta.env.VITE_TERMS_OF_SERVICE_URL, false),
    ageRestrictionEnabled: parseBoolean(import.meta.env.VITE_AGE_RESTICTION_ENABLED, false),
    minimumAge: parseNumber(import.meta.env.VITE_MINIMUM_AGE, 18),
    gdprCompliance: parseBoolean(import.meta.env.VITE_GDPR_COMPLIANCE, true),
    cookieConsentEnabled: parseBoolean(import.meta.env.VITE_COOKIE_CONSENT_ENABLED, false),
    dataRetentionDays: parseNumber(import.meta.env.VITE_DATA_RETENTION_DAYS, 365),

    // Monitoring & Alerts
    healthCheckEnabled: parseBoolean(import.meta.env.VITE_HEALTH_CHECK_ENABLED, true),
    healthCheckInterval: parseNumber(import.meta.env.VITE_HEALTH_CHECK_INTERVAL, 30000),
    healthCheckEndpoint: validateEnvVar('VITE_HEALTH_CHECK_ENDPOINT', import.meta.env.VITE_HEALTH_CHECK_ENDPOINT, false),
    errorReportingEnabled: parseBoolean(import.meta.env.VITE_ERROR_REPORTING_ENABLED, false),
    errorSampleRate: parseNumber(import.meta.env.VITE_ERROR_SAMPLE_RATE, 0.1),
    errorIncludeUserData: parseBoolean(import.meta.env.VITE_ERROR_INCLUDE_USER_DATA, false),
    performanceAlertsEnabled: parseBoolean(import.meta.env.VITE_PERFORMANCE_ALERTS_ENABLED, false),
    performanceThreshold: parseNumber(import.meta.env.VITE_PERFORMANCE_THRESHOLD, 3000),
    performanceSampleRate: parseNumber(import.meta.env.VITE_PERFORMANCE_SAMPLE_RATE, 0.05),

    // Deployment Configuration
    nodeEnv: validateEnvVar('VITE_NODE_ENV', import.meta.env.VITE_NODE_ENV, false),
    deploymentEnv: validateEnvVar('VITE_DEPLOYMENT_ENV', import.meta.env.VITE_DEPLOYMENT_ENV, false),
    buildTimestamp: parseBoolean(import.meta.env.VITE_BUILD_TIMESTAMP, true),
    deploymentVersion: validateEnvVar('VITE_DEPLOYMENT_VERSION', import.meta.env.VITE_DEPLOYMENT_VERSION, false),
    deploymentCommitHash: validateEnvVar('VITE_DEPLOYMENT_COMMIT_HASH', import.meta.env.VITE_DEPLOYMENT_COMMIT_HASH, false),
    deploymentBranch: validateEnvVar('VITE_DEPLOYMENT_BRANCH', import.meta.env.VITE_DEPLOYMENT_BRANCH, false),
    cdnDeployment: parseBoolean(import.meta.env.VITE_CDN_DEPLOYMENT, false),
    cdnProvider: validateEnvVar('VITE_CDN_PROVIDER', import.meta.env.VITE_CDN_PROVIDER, false),
    cdnRegion: validateEnvVar('VITE_CDN_REGION', import.meta.env.VITE_CDN_REGION, false),

    // Emergency Controls
    maintenanceMode: parseBoolean(import.meta.env.VITE_MAINTENANCE_MODE, false),
    maintenanceMessage: validateEnvVar('VITE_MAINTENANCE_MESSAGE', import.meta.env.VITE_MAINTENANCE_MESSAGE, false),
    maintenanceRedirectUrl: validateEnvVar('VITE_MAINTENANCE_REDIRECT_URL', import.meta.env.VITE_MAINTENANCE_REDIRECT_URL, false),
    emergencyShutdown: parseBoolean(import.meta.env.VITE_EMERGENCY_SHUTDOWN, false),
    emergencyMessage: validateEnvVar('VITE_EMERGENCY_MESSAGE', import.meta.env.VITE_EMERGENCY_MESSAGE, false),
    emergencyContact: validateEnvVar('VITE_EMERGENCY_CONTACT', import.meta.env.VITE_EMERGENCY_CONTACT, false),

    // Experimental Features
    enableBetaUi: parseBoolean(import.meta.env.VITE_ENABLE_BETA_UI, false),
    enableBetaApi: parseBoolean(import.meta.env.VITE_ENABLE_BETA_API, false),
    enableBetaAnalytics: parseBoolean(import.meta.env.VITE_ENABLE_BETA_ANALYTICS, false),
    enableAiFeatures: parseBoolean(import.meta.env.VITE_ENABLE_AI_FEATURES, false),
    aiModelVersion: validateEnvVar('VITE_AI_MODEL_VERSION', import.meta.env.VITE_AI_MODEL_VERSION, false),
    aiEndpoint: validateEnvVar('VITE_AI_ENDPOINT', import.meta.env.VITE_AI_ENDPOINT, false),
    enableWeb3Modal: parseBoolean(import.meta.env.VITE_ENABLE_WEB3_MODAL, false),
    enableNftFeatures: parseBoolean(import.meta.env.VITE_ENABLE_NFT_FEATURES, false),
    enableStaking: parseBoolean(import.meta.env.VITE_ENABLE_STAKING, false),
  };
};

/**
 * Get configuration for specific environment
 */
export const getEnvironmentConfigForEnv = (env: string = import.meta.env.MODE): EnvironmentConfig => {
  // In production, override some settings for security
  if (env === 'production') {
    const config = getEnvironmentConfig();
    return {
      ...config,
      // Disable debug features in production
      enableDevTools: false,
      enableDebugLogs: false,
      enableMockData: false,
      buildSourceMap: false,
      logToConsole: false,
      performanceMonitoring: true,
      securityHeadersEnabled: true,

      // Enable security features
      corsCredentials: false,
      errorReportingEnabled: true,

      // Strict rate limiting
      rateLimitRequests: parseNumber(import.meta.env.VITE_RATE_LIMIT_REQUESTS_PROD, 50),
      rateLimitWindow: parseNumber(import.meta.env.VITE_RATE_LIMIT_WINDOW_PROD, 60000),
    };
  }

  return getEnvironmentConfig();
};

/**
 * Check if feature is enabled
 */
export const isFeatureEnabled = (feature: keyof EnvironmentConfig): boolean => {
  const config = getEnvironmentConfig();
  const featureValue = config[feature];
  return typeof featureValue === 'boolean' ? featureValue : false;
};

/**
 * Get API endpoint with version
 */
export const getApiEndpoint = (path: string): string => {
  const config = getEnvironmentConfig();
  const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const version = config.apiVersion;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `${baseUrl}/${version}/${cleanPath}`;
};

/**
 * Get WebSocket endpoint
 */
export const getWebSocketEndpoint = (): string => {
  const config = getEnvironmentConfig();
  return config.wsUrl;
};

/**
 * Get block explorer URL for transaction
 */
export const getTransactionUrl = (txHash: string): string => {
  const config = getEnvironmentConfig();
  return `${config.blockExplorerUrl}/tx/${txHash}`;
};

/**
 * Get block explorer URL for address
 */
export const getAddressUrl = (address: string): string => {
  const config = getEnvironmentConfig();
  return `${config.blockExplorerUrl}/address/${address}`;
};

/**
 * Get block explorer URL for token
 */
export const getTokenUrl = (address: string): string => {
  const config = getEnvironmentConfig();
  return `${config.blockExplorerUrl}/token/${address}`;
};

/**
 * Validate configuration on startup
 */
export const validateConfiguration = (): boolean => {
  try {
    const config = getEnvironmentConfig();

    // Validate required URLs
    const requiredUrls = [
      config.apiBaseUrl,
      config.rpcUrl,
      config.blockExplorerUrl,
    ];

    const invalidUrls = requiredUrls.filter(url => {
      try {
        new URL(url);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      console.error('Invalid URLs in configuration:', invalidUrls);
      return false;
    }

    // Validate blockchain addresses
    const requiredAddresses = [
      config.bondingCurveAddress,
      config.tokenFactoryAddress,
      config.routerAddress,
    ];

    const invalidAddresses = requiredAddresses.filter(address => {
      return !address || !address.startsWith('0x') || address.length !== 42;
    });

    if (invalidAddresses.length > 0) {
      console.warn('Invalid blockchain addresses in configuration:', invalidAddresses);
    }

    // Validate numeric values
    const numericValidations = [
      { name: 'chainId', value: config.chainId, min: 1, max: 999999 },
      { name: 'cacheTtl', value: config.cacheTtl, min: 1000, max: 3600000 },
      { name: 'rateLimitRequests', value: config.rateLimitRequests, min: 1, max: 10000 },
    ];

    for (const validation of numericValidations) {
      if (validation.value < validation.min || validation.value > validation.max) {
        console.error(
          `Invalid ${validation.name}: ${validation.value}. Must be between ${validation.min} and ${validation.max}`
        );
        return false;
      }
    }

    console.log('✅ Environment configuration validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    return false;
  }
};

// Export singleton instance
export const config = getEnvironmentConfigForEnv();