/**
 * Environment Configuration Types
 * TypeScript types for environment variables and configuration
 */

export interface EnvironmentVariables {
  // API Configuration
  VITE_API_BASE_URL: string;
  VITE_API_VERSION?: string;
  VITE_WS_URL?: string;
  VITE_WS_RECONNECT_ATTEMPTS?: string;
  VITE_WS_RECONNECT_DELAY?: string;

  // Blockchain Configuration
  VITE_BLOCKCHAIN_NETWORK: string;
  VITE_CHAIN_ID?: string;
  VITE_RPC_URL: string;
  VITE_BLOCK_EXPLORER_URL: string;
  VITE_BONDING_CURVE_ADDRESS: string;
  VITE_TOKEN_FACTORY_ADDRESS: string;
  VITE_ROUTER_ADDRESS: string;

  // Application Configuration
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_APP_DESCRIPTION?: string;
  VITE_APP_URL?: string;

  // Feature Flags
  VITE_ENABLE_ANALYTICS?: string;
  VITE_ENABLE_ERROR_REPORTING?: string;
  VITE_ENABLE_PERFORMANCE_MONITORING?: string;
  VITE_ENABLE_SOCIAL_FEATURES?: string;
  VITE_ENABLE_ADVANCED_SEARCH?: string;
  VITE_ENABLE_NOTIFICATIONS?: string;
  VITE_ENABLE_DEV_TOOLS?: string;
  VITE_ENABLE_MOCK_DATA?: string;
  VITE_ENABLE_DEBUG_LOGS?: string;

  // Security Configuration
  VITE_CORS_ORIGIN?: string;
  VITE_CORS_CREDENTIALS?: string;
  VITE_RATE_LIMIT_REQUESTS?: string;
  VITE_RATE_LIMIT_WINDOW?: string;
  VITE_CSP_ENABLED?: string;
  VITE_CSP_SCRIPT_SRC?: string;
  VITE_CSP_STYLE_SRC?: string;
  VITE_CSP_IMG_SRC?: string;
  VITE_CSP_CONNECT_SRC?: string;

  // Performance Configuration
  VITE_CACHE_ENABLED?: string;
  VITE_CACHE_TTL?: string;
  VITE_CACHE_MAX_SIZE?: string;
  VITE_LAZY_LOADING_ENABLED?: string;
  VITE_LAZY_LOADING_THRESHOLD?: string;
  VITE_PLACEHOLDER_BLUR?: string;
  VITE_IMAGE_OPTIMIZATION?: string;
  VITE_IMAGE_QUALITY?: string;
  VITE_IMAGE_PLACEHOLDER?: string;

  // Third-party Services
  VITE_WALLETCONNECT_PROJECT_ID?: string;
  VITE_META_MASK_DEEPLINK?: string;
  VITE_IPFS_GATEWAY?: string;
  VITE_IPFS_BACKUP_GATEWAY?: string;
  VITE_TWITTER_HANDLE?: string;
  VITE_TELEGRAM_GROUP?: string;
  VITE_DISCORD_INVITE?: string;

  // UI/UX Configuration
  VITE_DEFAULT_THEME?: string;
  VITE_THEME_PERSISTENCE?: string;
  VITE_ANIMATION_DURATION?: string;
  VITE_PAGINATION_DEFAULT_SIZE?: string;
  VITE_PAGINATION_MAX_SIZE?: string;
  VITE_SEARCH_DEBOUNCE_DELAY?: string;
  VITE_SEARCH_MIN_LENGTH?: string;
  VITE_SEARCH_MAX_RESULTS?: string;
  VITE_NOTIFICATION_DURATION?: string;
  VITE_NOTIFICATION_POSITION?: string;
  VITE_NOTIFICATION_MAX_VISIBLE?: string;

  // Development & Debugging
  VITE_LOG_LEVEL?: string;
  VITE_LOG_TO_CONSOLE?: string;
  VITE_LOG_TO_FILE?: string;
  VITE_PERFORMANCE_MONITORING?: string;
  VITE_PERFORMANCE_SAMPLE_RATE?: string;
  VITE_ENABLE_BETA_FEATURES?: string;
  VITE_ENABLE_EXPERIMENTAL_FEATURES?: string;

  // Production Specific
  VITE_BUILD_SOURCEMAP?: string;
  VITE_BUILD_MINIFY?: string;
  VITE_BUILD_TARGET?: string;
  VITE_SECURITY_HEADERS_ENABLED?: string;
  VITE_X_FRAME_OPTIONS?: string;
  VITE_X_CONTENT_TYPE_OPTIONS?: string;
  VITE_REFERRER_POLICY?: string;

  // API Keys (Optional)
  VITE_ETHERSCAN_API_KEY?: string;
  VITE_COINGECKO_API_KEY?: string;
  VITE_MORALIS_API_KEY?: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  VITE_ANALYTICS_ENDPOINT?: string;
  VITE_ANALYTICS_API_KEY?: string;

  // Testing Configuration
  VITE_TEST_MODE?: string;
  VITE_TEST_NETWORK?: string;
  VITE_TEST_PRIVATE_KEY?: string;
  VITE_ENABLE_MOCK_API?: string;
  VITE_MOCK_API_DELAY?: string;
  VITE_MOCK_ERROR_RATE?: string;
  VITE_E2E_TESTING?: string;
  VITE_E2E_HEADLESS?: string;
  VITE_E2E_TIMEOUT?: string;

  // Backup & Redundancy
  VITE_BACKUP_API_URL?: string;
  VITE_FAILOVER_ENABLED?: string;
  VITE_FAILOVER_TIMEOUT?: string;
  VITE_CDN_ENABLED?: string;
  VITE_CDN_URL?: string;
  VITE_CDN_VERSION?: string;

  // Regional Configuration
  VITE_DEFAULT_REGION?: string;
  VITE_ENABLE_REGIONAL_FEATURES?: string;
  VITE_REGION_DETECTION?: string;
  VITE_DEFAULT_CURRENCY?: string;
  VITE_ENABLE_CURRENCY_CONVERSION?: string;
  VITE_CURRENCY_API_KEY?: string;
  VITE_DEFAULT_LANGUAGE?: string;
  VITE_ENABLE_MULTILINGUAL?: string;
  VITE_SUPPORTED_LANGUAGES?: string;

  // Legal & Compliance
  VITE_PRIVACY_POLICY_URL?: string;
  VITE_TERMS_OF_SERVICE_URL?: string;
  VITE_AGE_RESTICTION_ENABLED?: string;
  VITE_MINIMUM_AGE?: string;
  VITE_GDPR_COMPLIANCE?: string;
  VITE_COOKIE_CONSENT_ENABLED?: string;
  VITE_DATA_RETENTION_DAYS?: string;

  // Monitoring & Alerts
  VITE_HEALTH_CHECK_ENABLED?: string;
  VITE_HEALTH_CHECK_INTERVAL?: string;
  VITE_HEALTH_CHECK_ENDPOINT?: string;
  VITE_ERROR_REPORTING_ENABLED?: string;
  VITE_ERROR_SAMPLE_RATE?: string;
  VITE_ERROR_INCLUDE_USER_DATA?: string;
  VITE_PERFORMANCE_ALERTS_ENABLED?: string;
  VITE_PERFORMANCE_THRESHOLD?: string;
  VITE_PERFORMANCE_SAMPLE_RATE?: string;

  // Deployment Configuration
  VITE_NODE_ENV?: string;
  VITE_DEPLOYMENT_ENV?: string;
  VITE_BUILD_TIMESTAMP?: string;
  VITE_DEPLOYMENT_VERSION?: string;
  VITE_DEPLOYMENT_COMMIT_HASH?: string;
  VITE_DEPLOYMENT_BRANCH?: string;
  VITE_CDN_DEPLOYMENT?: string;
  VITE_CDN_PROVIDER?: string;
  VITE_CDN_REGION?: string;

  // Emergency Controls
  VITE_MAINTENANCE_MODE?: string;
  VITE_MAINTENANCE_MESSAGE?: string;
  VITE_MAINTENANCE_REDIRECT_URL?: string;
  VITE_EMERGENCY_SHUTDOWN?: string;
  VITE_EMERGENCY_MESSAGE?: string;
  VITE_EMERGENCY_CONTACT?: string;

  // Experimental Features
  VITE_ENABLE_BETA_UI?: string;
  VITE_ENABLE_BETA_API?: string;
  VITE_ENABLE_BETA_ANALYTICS?: string;
  VITE_ENABLE_AI_FEATURES?: string;
  VITE_AI_MODEL_VERSION?: string;
  VITE_AI_ENDPOINT?: string;
  VITE_ENABLE_WEB3_MODAL?: string;
  VITE_ENABLE_NFT_FEATURES?: string;
  VITE_ENABLE_STAKING?: string;

  // Production Rate Limiting
  VITE_RATE_LIMIT_REQUESTS_PROD?: string;
  VITE_RATE_LIMIT_WINDOW_PROD?: string;
}

export interface ImportMetaEnv extends EnvironmentVariables {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Utility types for environment parsing
export type EnvironmentValue<T> = T | string | undefined;
export type EnvironmentBoolean = boolean | string | undefined;
export type EnvironmentNumber = number | string | undefined;

// Configuration interfaces
export interface ApiConfiguration {
  baseUrl: string;
  version: string;
  wsUrl?: string;
  wsReconnectAttempts: number;
  wsReconnectDelay: number;
}

export interface BlockchainConfiguration {
  network: string;
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  bondingCurveAddress: string;
  tokenFactoryAddress: string;
  routerAddress: string;
}

export interface SecurityConfiguration {
  corsOrigin: string;
  corsCredentials: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  cspEnabled: boolean;
  cspScriptSrc: string;
  cspStyleSrc: string;
  cspImgSrc: string;
  cspConnectSrc: string;
}

export interface PerformanceConfiguration {
  cacheEnabled: boolean;
  cacheTtl: number;
  cacheMaxSize: number;
  lazyLoadingEnabled: boolean;
  lazyLoadingThreshold: number;
  placeholderBlur: boolean;
  imageOptimization: boolean;
  imageQuality: number;
  imagePlaceholder: boolean;
}

export interface FeatureFlagsConfiguration {
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  enableSocialFeatures: boolean;
  enableAdvancedSearch: boolean;
  enableNotifications: boolean;
  enableDevTools: boolean;
  enableMockData: boolean;
  enableDebugLogs: boolean;
}

export interface ThirdPartyConfiguration {
  walletConnectProjectId?: string;
  metaMaskDeepLink?: string;
  ipfsGateway?: string;
  ipfsBackupGateway?: string;
  twitterHandle?: string;
  telegramGroup?: string;
  discordInvite?: string;
}

export interface UIConfiguration {
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
}

export interface MonitoringConfiguration {
  logLevel: string;
  logToConsole: boolean;
  logToFile: boolean;
  performanceMonitoring: boolean;
  performanceSampleRate: number;
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
  healthCheckEndpoint: string;
  errorReportingEnabled: boolean;
  errorSampleRate: number;
  errorIncludeUserData: boolean;
}

export interface DeploymentConfiguration {
  nodeEnv: string;
  deploymentEnv: string;
  buildTimestamp: boolean;
  deploymentVersion: string;
  deploymentCommitHash: string;
  deploymentBranch: string;
  buildSourceMap: boolean;
  buildMinify: boolean;
  buildTarget: string;
}

export interface EmergencyConfiguration {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceRedirectUrl: string;
  emergencyShutdown: boolean;
  emergencyMessage: string;
  emergencyContact: string;
}

export interface ExperimentalConfiguration {
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

// Environment validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ConfigurationValidation extends ValidationResult {
  securityScore: number;
  performanceScore: number;
  readinessScore: number;
}

// Environment parsing utilities
export type EnvironmentParser = {
  string: (value: EnvironmentValue<string>, defaultValue?: string) => string;
  number: (value: EnvironmentNumber, defaultValue?: number) => number;
  boolean: (value: EnvironmentBoolean, defaultValue?: boolean) => boolean;
  array: (value: EnvironmentValue<string>, defaultValue?: string[]) => string[];
  url: (value: EnvironmentValue<string>, defaultValue?: string) => URL;
  email: (value: EnvironmentValue<string>, defaultValue?: string) => string;
  json: <T = any>(value: EnvironmentValue<string>, defaultValue?: T) => T;
};

// Environment categories
export type EnvironmentCategory =
  | 'api'
  | 'blockchain'
  | 'security'
  | 'performance'
  | 'features'
  | 'ui'
  | 'monitoring'
  | 'deployment'
  | 'emergency'
  | 'experimental';

// Environment schema for validation
export interface EnvironmentSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'array';
    required?: boolean;
    defaultValue?: any;
    validation?: (value: any) => boolean;
    description?: string;
    category?: EnvironmentCategory;
  };
}

// Environment configuration metadata
export interface EnvironmentMetadata {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  environments: string[];
  categories: EnvironmentCategory[];
}

// Environment change events
export interface EnvironmentChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  category: EnvironmentCategory;
}

// Environment health check
export interface EnvironmentHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
  }>;
  timestamp: string;
}

// Environment backup and restore
export interface EnvironmentBackup {
  id: string;
  timestamp: string;
  environment: string;
  configuration: Record<string, any>;
  metadata: {
    version: string;
    description?: string;
    createdBy?: string;
  };
}

// Environment metrics
export interface EnvironmentMetrics {
  configuration: {
    totalVariables: number;
    requiredVariables: number;
    optionalVariables: number;
  };
  validation: {
    errors: number;
    warnings: number;
    recommendations: number;
  };
  performance: {
    loadTime: number;
    validationTime: number;
    memoryUsage: number;
  };
  usage: {
    lastAccessed: string;
    accessCount: number;
    popularFeatures: string[];
  };
}

// Environment template
export interface EnvironmentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'staging' | 'production' | 'testing';
  variables: Record<string, {
    value: string;
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
  metadata: {
    version: string;
    author: string;
    createdAt: string;
    tags: string[];
  };
}

// Environment diff
export interface EnvironmentDiff {
  added: string[];
  removed: string[];
  modified: Array<{
    key: string;
    oldValue: any;
    newValue: any;
  }>;
  unchanged: string[];
}

// Environment migration
export interface EnvironmentMigration {
  id: string;
  version: string;
  description: string;
  up: (config: Record<string, any>) => Record<string, any>;
  down: (config: Record<string, any>) => Record<string, any>;
  metadata: {
    author: string;
    createdAt: string;
    dependencies: string[];
  };
}

// Export all types for global use
export type {
  ImportMetaEnv,
  ImportMeta,
  EnvironmentVariables,
  ApiConfiguration,
  BlockchainConfiguration,
  SecurityConfiguration,
  PerformanceConfiguration,
  FeatureFlagsConfiguration,
  ThirdPartyConfiguration,
  UIConfiguration,
  MonitoringConfiguration,
  DeploymentConfiguration,
  EmergencyConfiguration,
  ExperimentalConfiguration,
};