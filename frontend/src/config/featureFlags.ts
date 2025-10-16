/**
 * Feature Flags System
 * Centralized feature flag management for RabbitFun Launchpad
 */

import { config } from './environment';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'security' | 'performance' | 'ux' | 'analytics' | 'social' | 'advanced' | 'experimental';
  requiresAuth?: boolean;
  environments?: string[];
  rolloutPercentage?: number;
}

interface FeatureFlagConfig {
  [key: string]: FeatureFlag;
}

/**
 * Feature flags definition
 */
export const FEATURE_FLAGS: FeatureFlagConfig = {
  // Security Features
  SECURE_CSP: {
    key: 'SECURE_CSP',
    name: 'Content Security Policy',
    description: 'Enable strict Content Security Policy headers',
    enabled: config.cspEnabled,
    category: 'security',
  },
  RATE_LIMITING_STRICT: {
    key: 'RATE_LIMITING_STRICT',
    name: 'Strict Rate Limiting',
    description: 'Enable stricter rate limiting for production',
    enabled: import.meta.env.MODE === 'production',
    category: 'security',
    environments: ['production'],
  },
  SECURITY_HEADERS: {
    key: 'SECURITY_HEADERS',
    name: 'Security Headers',
    description: 'Enable comprehensive security headers',
    enabled: config.securityHeadersEnabled,
    category: 'security',
  },

  // Performance Features
  PERFORMANCE_MONITORING: {
    key: 'PERFORMANCE_MONITORING',
    name: 'Performance Monitoring',
    description: 'Enable detailed performance monitoring and metrics collection',
    enabled: config.enablePerformanceMonitoring,
    category: 'performance',
  },
  ADVANCED_CACHING: {
    key: 'ADVANCED_CACHING',
    name: 'Advanced Caching',
    description: 'Enable intelligent caching with deduplication and compression',
    enabled: config.cacheEnabled,
    category: 'performance',
  },
  LAZY_LOADING: {
    key: 'LAZY_LOADING',
    name: 'Lazy Loading',
    description: 'Enable lazy loading for images and components',
    enabled: config.lazyLoadingEnabled,
    category: 'performance',
  },
  IMAGE_OPTIMIZATION: {
    key: 'IMAGE_OPTIMIZATION',
    name: 'Image Optimization',
    description: 'Enable automatic image optimization and compression',
    enabled: config.imageOptimization,
    category: 'performance',
  },
  VIRTUAL_SCROLLING: {
    key: 'VIRTUAL_SCROLLING',
    name: 'Virtual Scrolling',
    description: 'Enable virtual scrolling for large token lists',
    enabled: true,
    category: 'performance',
  },

  // User Experience Features
  ERROR_BOUNDARIES: {
    key: 'ERROR_BOUNDARIES',
    name: 'Error Boundaries',
    description: 'Enable comprehensive error boundaries with retry mechanisms',
    enabled: true,
    category: 'ux',
  },
  NOTIFICATIONS: {
    key: 'NOTIFICATIONS',
    name: 'Real-time Notifications',
    description: 'Enable real-time notification system',
    enabled: config.enableNotifications,
    category: 'ux',
    requiresAuth: true,
  },
  ADVANCED_SEARCH: {
    key: 'ADVANCED_SEARCH',
    name: 'Advanced Search',
    description: 'Enable advanced search with filtering and sorting',
    enabled: config.enableAdvancedSearch,
    category: 'ux',
  },
  SOCIAL_FEATURES: {
    key: 'SOCIAL_FEATURES',
    name: 'Social Features',
    description: 'Enable social features like comments and sharing',
    enabled: config.enableSocialFeatures,
    category: 'ux',
    requiresAuth: true,
  },
  THEME_CUSTOMIZATION: {
    key: 'THEME_CUSTOMIZATION',
    name: 'Theme Customization',
    description: 'Allow users to customize theme and appearance',
    enabled: config.themePersistence,
    category: 'ux',
  },
  ANIMATIONS_ENHANCED: {
    key: 'ANIMATIONS_ENHANCED',
    name: 'Enhanced Animations',
    description: 'Enable enhanced animations and transitions',
    enabled: config.animationDuration > 0,
    category: 'ux',
  },

  // Analytics Features
  ANALYTICS_TRACKING: {
    key: 'ANALYTICS_TRACKING',
    name: 'Analytics Tracking',
    description: 'Enable user behavior analytics and tracking',
    enabled: config.enableAnalytics,
    category: 'analytics',
  },
  ERROR_REPORTING: {
    key: 'ERROR_REPORTING',
    name: 'Error Reporting',
    description: 'Enable automatic error reporting to monitoring services',
    enabled: config.enableErrorReporting,
    category: 'analytics',
  },
  PERFORMANCE_TRACKING: {
    key: 'PERFORMANCE_TRACKING',
    name: 'Performance Tracking',
    description: 'Track performance metrics and user experience data',
    enabled: config.performanceMonitoring,
    category: 'analytics',
  },
  HEATMAP_TRACKING: {
    key: 'HEATMAP_TRACKING',
    name: 'Heatmap Tracking',
    description: 'Enable user interaction heatmap tracking',
    enabled: false,
    category: 'analytics',
    rolloutPercentage: 10,
  },

  // Advanced Features
  MULTI_LANGUAGE: {
    key: 'MULTI_LANGUAGE',
    name: 'Multi-language Support',
    description: 'Enable internationalization and multiple language support',
    enabled: config.enableMultilingual,
    category: 'advanced',
  },
  CURRENCY_CONVERSION: {
    key: 'CURRENCY_CONVERSION',
    name: 'Currency Conversion',
    description: 'Enable currency conversion and display',
    enabled: config.enableCurrencyConversion,
    category: 'advanced',
  },
  REGIONAL_FEATURES: {
    key: 'REGIONAL_FEATURES',
    name: 'Regional Features',
    description: 'Enable region-specific features and optimizations',
    enabled: config.enableRegionalFeatures,
    category: 'advanced',
  },
  MOBILE_OPTIMIZATIONS: {
    key: 'MOBILE_OPTIMIZATIONS',
    name: 'Mobile Optimizations',
    description: 'Enable mobile-specific optimizations and features',
    enabled: true,
    category: 'advanced',
  },
  PWA_FEATURES: {
    key: 'PWA_FEATURES',
    name: 'PWA Features',
    description: 'Enable Progressive Web App features',
    enabled: false,
    category: 'advanced',
    rolloutPercentage: 5,
  },

  // Experimental Features
  AI_FEATURES: {
    key: 'AI_FEATURES',
    name: 'AI-powered Features',
    description: 'Enable experimental AI-powered features',
    enabled: config.enableAiFeatures,
    category: 'experimental',
    requiresAuth: true,
    rolloutPercentage: 1,
  },
  BETA_UI: {
    key: 'BETA_UI',
    name: 'Beta UI Components',
    description: 'Enable beta version of UI components',
    enabled: config.enableBetaUi,
    category: 'experimental',
  },
  WEB3_MODAL: {
    key: 'WEB3_MODAL',
    name: 'Enhanced Web3 Modal',
    description: 'Enable enhanced Web3 connection modal',
    enabled: config.enableWeb3Modal,
    category: 'experimental',
  },
  NFT_FEATURES: {
    key: 'NFT_FEATURES',
    name: 'NFT Features',
    description: 'Enable experimental NFT features',
    enabled: config.enableNftFeatures,
    category: 'experimental',
    rolloutPercentage: 1,
  },
  STAKING_FEATURES: {
    key: 'STAKING_FEATURES',
    name: 'Staking Features',
    description: 'Enable experimental staking features',
    enabled: config.enableStaking,
    category: 'experimental',
    rolloutPercentage: 1,
  },

  // Development Features
  DEV_TOOLS: {
    key: 'DEV_TOOLS',
    name: 'Development Tools',
    description: 'Enable development and debugging tools',
    enabled: config.enableDevTools,
    category: 'advanced',
    environments: ['development'],
  },
  DEBUG_LOGS: {
    key: 'DEBUG_LOGS',
    name: 'Debug Logs',
    description: 'Enable detailed debug logging',
    enabled: config.enableDebugLogs,
    category: 'advanced',
    environments: ['development'],
  },
  MOCK_DATA: {
    key: 'MOCK_DATA',
    name: 'Mock Data',
    description: 'Use mock data for development and testing',
    enabled: config.enableMockData,
    category: 'advanced',
    environments: ['development'],
  },
};

/**
 * Feature Flag Manager Class
 */
export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private userFlags: Map<string, boolean> = new Map();
  private sessionStorageFlags: Map<string, boolean> = new Map();

  private constructor() {
    this.loadSessionFlags();
  }

  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Check if a feature is enabled
   */
  public isEnabled(flagKey: string, userId?: string): boolean {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`Feature flag ${flagKey} not found`);
      return false;
    }

    // Check environment restrictions
    if (flag.environments && !flag.environments.includes(import.meta.env.MODE)) {
      return false;
    }

    // Check if user is authenticated (if required)
    if (flag.requiresAuth && !userId) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage && userId) {
      const hash = this.hashUserId(userId);
      const userPercentage = hash % 100;
      if (userPercentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    // Check session storage overrides
    if (this.sessionStorageFlags.has(flagKey)) {
      return this.sessionStorageFlags.get(flagKey)!;
    }

    // Check user-specific overrides
    if (userId && this.userFlags.has(flagKey)) {
      return this.userFlags.get(flagKey)!;
    }

    return flag.enabled;
  }

  /**
   * Enable a feature for current session
   */
  public enableForSession(flagKey: string): void {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`Feature flag ${flagKey} not found`);
      return;
    }

    this.sessionStorageFlags.set(flagKey, true);
    this.saveSessionFlags();
  }

  /**
   * Disable a feature for current session
   */
  public disableForSession(flagKey: string): void {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`Feature flag ${flagKey} not found`);
      return;
    }

    this.sessionStorageFlags.set(flagKey, false);
    this.saveSessionFlags();
  }

  /**
   * Enable a feature for a specific user
   */
  public enableForUser(flagKey: string, userId: string): void {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`Feature flag ${flagKey} not found`);
      return;
    }

    this.userFlags.set(`${flagKey}:${userId}`, true);
  }

  /**
   * Disable a feature for a specific user
   */
  public disableForUser(flagKey: string, userId: string): void {
    const flag = FEATURE_FLAGS[flagKey];
    if (!flag) {
      console.warn(`Feature flag ${flagKey} not found`);
      return;
    }

    this.userFlags.set(`${flagKey}:${userId}`, false);
  }

  /**
   * Get all feature flags
   */
  public getAllFlags(): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS);
  }

  /**
   * Get feature flags by category
   */
  public getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(flag => flag.category === category);
  }

  /**
   * Get enabled feature flags
   */
  public getEnabledFlags(userId?: string): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(flag => this.isEnabled(flag.key, userId));
  }

  /**
   * Get disabled feature flags
   */
  public getDisabledFlags(userId?: string): FeatureFlag[] {
    return Object.values(FEATURE_FLAGS).filter(flag => !this.isEnabled(flag.key, userId));
  }

  /**
   * Reset session flags
   */
  public resetSessionFlags(): void {
    this.sessionStorageFlags.clear();
    sessionStorage.removeItem('featureFlags');
  }

  /**
   * Export feature flags state
   */
  public exportState(): Record<string, any> {
    return {
      sessionFlags: Object.fromEntries(this.sessionStorageFlags),
      userFlags: Object.fromEntries(this.userFlags),
      timestamp: Date.now(),
    };
  }

  /**
   * Import feature flags state
   */
  public importState(state: Record<string, any>): void {
    if (state.sessionFlags) {
      this.sessionStorageFlags = new Map(Object.entries(state.sessionFlags));
      this.saveSessionFlags();
    }
    if (state.userFlags) {
      this.userFlags = new Map(Object.entries(state.userFlags));
    }
  }

  /**
   * Hash user ID for rollout percentage
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Load session flags from sessionStorage
   */
  private loadSessionFlags(): void {
    try {
      const stored = sessionStorage.getItem('featureFlags');
      if (stored) {
        const flags = JSON.parse(stored);
        this.sessionStorageFlags = new Map(Object.entries(flags));
      }
    } catch (error) {
      console.warn('Failed to load feature flags from sessionStorage:', error);
    }
  }

  /**
   * Save session flags to sessionStorage
   */
  private saveSessionFlags(): void {
    try {
      const flags = Object.fromEntries(this.sessionStorageFlags);
      sessionStorage.setItem('featureFlags', JSON.stringify(flags));
    } catch (error) {
      console.warn('Failed to save feature flags to sessionStorage:', error);
    }
  }
}

/**
 * Feature flag hook for React components
 */
export const useFeatureFlag = (flagKey: string, userId?: string): boolean => {
  const manager = FeatureFlagManager.getInstance();
  return manager.isEnabled(flagKey, userId);
};

/**
 * Feature flag hook for multiple flags
 */
export const useFeatureFlags = (flagKeys: string[], userId?: string): Record<string, boolean> => {
  const manager = FeatureFlagManager.getInstance();
  return flagKeys.reduce((acc, key) => {
    acc[key] = manager.isEnabled(key, userId);
    return acc;
  }, {} as Record<string, boolean>);
};

/**
 * Check if feature is enabled (convenience function)
 */
export const isFeatureEnabled = (flagKey: string, userId?: string): boolean => {
  const manager = FeatureFlagManager.getInstance();
  return manager.isEnabled(flagKey, userId);
};

/**
 * Get all enabled features for a user
 */
export const getEnabledFeatures = (userId?: string): FeatureFlag[] => {
  const manager = FeatureFlagManager.getInstance();
  return manager.getEnabledFlags(userId);
};

/**
 * Get all features in a category
 */
export const getFeaturesByCategory = (category: FeatureFlag['category']): FeatureFlag[] => {
  const manager = FeatureFlagManager.getInstance();
  return manager.getFlagsByCategory(category);
};

/**
 * Enable feature for development
 */
export const enableFeatureForDev = (flagKey: string): void => {
  if (import.meta.env.MODE === 'development') {
    const manager = FeatureFlagManager.getInstance();
    manager.enableForSession(flagKey);
    console.log(`✅ Feature flag ${flagKey} enabled for development session`);
  }
};

/**
 * Disable feature for development
 */
export const disableFeatureForDev = (flagKey: string): void => {
  if (import.meta.env.MODE === 'development') {
    const manager = FeatureFlagManager.getInstance();
    manager.disableForSession(flagKey);
    console.log(`❌ Feature flag ${flagKey} disabled for development session`);
  }
};

/**
 * Development utility to toggle features
 */
export const toggleFeatureForDev = (flagKey: string): void => {
  const manager = FeatureFlagManager.getInstance();
  const current = manager.isEnabled(flagKey);
  if (current) {
    disableFeatureForDev(flagKey);
  } else {
    enableFeatureForDev(flagKey);
  }
};

// Export singleton instance
export const featureFlagManager = FeatureFlagManager.getInstance();