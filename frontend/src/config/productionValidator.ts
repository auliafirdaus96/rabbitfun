/**
 * Production Configuration Validator
 * Validates and ensures production readiness
 */

import { config, validateConfiguration } from './environment';
import { featureFlagManager } from './featureFlags';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  securityScore: number;
  performanceScore: number;
  readinessScore: number;
}

interface SecurityCheck {
  name: string;
  check: () => boolean;
  errorMessage: string;
  category: 'critical' | 'warning' | 'info';
  points: number;
}

interface PerformanceCheck {
  name: string;
  check: () => boolean;
  errorMessage: string;
  recommendations: string[];
  points: number;
}

interface ProductionCheck {
  name: string;
  check: () => boolean;
  errorMessage: string;
  category: 'critical' | 'warning' | 'info';
}

export class ProductionValidator {
  private static instance: ProductionValidator;

  private constructor() {}

  public static getInstance(): ProductionValidator {
    if (!ProductionValidator.instance) {
      ProductionValidator.instance = new ProductionValidator();
    }
    return ProductionValidator.instance;
  }

  /**
   * Comprehensive production validation
   */
  public validateProductionReadiness(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Security validation
    const securityResult = this.validateSecurity();
    errors.push(...securityResult.errors);
    warnings.push(...securityResult.warnings);
    const securityScore = securityResult.score;

    // Performance validation
    const performanceResult = this.validatePerformance();
    errors.push(...performanceResult.errors);
    recommendations.push(...performanceResult.recommendations);
    const performanceScore = performanceResult.score;

    // Configuration validation
    const configResult = this.validateConfiguration();
    errors.push(...configResult.errors);
    warnings.push(...configResult.warnings);

    // Feature flags validation
    const featureResult = this.validateFeatureFlags();
    errors.push(...featureResult.errors);
    warnings.push(...featureResult.warnings);

    // Emergency controls validation
    const emergencyResult = this.validateEmergencyControls();
    errors.push(...emergencyResult.errors);
    warnings.push(...emergencyResult.warnings);

    // Calculate overall readiness score
    const readinessScore = this.calculateReadinessScore(
      securityScore,
      performanceScore,
      errors.length,
      warnings.length
    );

    const isValid = errors.length === 0 && securityScore >= 80 && performanceScore >= 70;

    return {
      isValid,
      errors,
      warnings,
      recommendations,
      securityScore,
      performanceScore,
      readinessScore,
    };
  }

  /**
   * Security validation
   */
  private validateSecurity(): { errors: string[]; warnings: string[]; score: number } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const securityChecks: SecurityCheck[] = [
      {
        name: 'Production Environment',
        check: () => import.meta.env.MODE === 'production',
        errorMessage: 'Application is not running in production mode',
        category: 'critical',
        points: 20,
      },
      {
        name: 'Security Headers',
        check: () => config.securityHeadersEnabled,
        errorMessage: 'Security headers are disabled',
        category: 'critical',
        points: 15,
      },
      {
        name: 'Content Security Policy',
        check: () => config.cspEnabled,
        errorMessage: 'Content Security Policy is disabled',
        category: 'critical',
        points: 10,
      },
      {
        name: 'Source Maps Disabled',
        check: () => !config.buildSourceMap,
        errorMessage: 'Source maps are enabled in production (security risk)',
        category: 'critical',
        points: 10,
      },
      {
        name: 'Debug Logging Disabled',
        check: () => !config.enableDebugLogs,
        errorMessage: 'Debug logging is enabled in production',
        category: 'warning',
        points: 5,
      },
      {
        name: 'Error Reporting Enabled',
        check: () => config.enableErrorReporting,
        errorMessage: 'Error reporting is disabled (security risk)',
        category: 'warning',
        points: 5,
      },
      {
        name: 'HTTPS Only',
        check: () => config.appUrl.startsWith('https://'),
        errorMessage: 'App URL is not using HTTPS',
        category: 'critical',
        points: 15,
      },
      {
        name: 'Rate Limiting',
        check: () => config.rateLimitRequests > 0 && config.rateLimitWindow > 0,
        errorMessage: 'Rate limiting is not configured',
        category: 'critical',
        points: 10,
      },
      {
        name: 'No Development Tools',
        check: () => !config.enableDevTools,
        errorMessage: 'Development tools are enabled in production',
        category: 'warning',
        points: 5,
      },
      {
        name: 'Secure CORS Configuration',
        check: () => !config.corsCredentials || config.corsOrigin === 'https://rabbitfun.io',
        errorMessage: 'CORS credentials are enabled for external origins',
        category: 'warning',
        points: 5,
      },
    ];

    for (const check of securityChecks) {
      if (!check.check()) {
        if (check.category === 'critical') {
          errors.push(`🚫 ${check.errorMessage}`);
        } else {
          warnings.push(`⚠️ ${check.errorMessage}`);
        }
        score -= check.points;
      }
    }

    return { errors, warnings, score: Math.max(0, score) };
  }

  /**
   * Performance validation
   */
  private validatePerformance(): { errors: string[]; recommendations: string[]; score: number } {
    const errors: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const performanceChecks: PerformanceCheck[] = [
      {
        name: 'Caching Enabled',
        check: () => config.cacheEnabled,
        errorMessage: 'Caching is disabled',
        recommendations: [
          'Enable caching to improve performance',
          'Configure appropriate cache TTL values',
          'Consider Redis or memory caching for frequently accessed data',
        ],
        points: 20,
      },
      {
        name: 'Lazy Loading Enabled',
        check: () => config.lazyLoadingEnabled,
        errorMessage: 'Lazy loading is disabled',
        recommendations: [
          'Enable lazy loading for images and components',
          'Configure appropriate lazy loading thresholds',
          'Add placeholder elements for better UX',
        ],
        points: 15,
      },
      {
        name: 'Image Optimization',
        check: () => config.imageOptimization,
        errorMessage: 'Image optimization is disabled',
        recommendations: [
          'Enable image optimization to reduce load times',
          'Configure appropriate image quality settings',
          'Use modern image formats like WebP',
        ],
        points: 15,
      },
      {
        name: 'Performance Monitoring',
        check: () => config.enablePerformanceMonitoring,
        errorMessage: 'Performance monitoring is disabled',
        recommendations: [
          'Enable performance monitoring to track bottlenecks',
          'Configure appropriate sampling rates',
          'Set up alerts for performance degradation',
        ],
        points: 10,
      },
      {
        name: 'Build Optimization',
        check: () => config.buildMinify,
        errorMessage: 'Build minification is disabled',
        recommendations: [
          'Enable build minification to reduce bundle size',
          'Configure appropriate build targets',
          'Consider code splitting for better performance',
        ],
        points: 15,
      },
      {
        name: 'CDN Configuration',
        check: () => config.cdnEnabled,
        errorMessage: 'CDN is not configured',
        recommendations: [
          'Configure CDN for static assets',
          'Set up appropriate CDN caching headers',
          'Consider multiple CDN regions for better performance',
        ],
        points: 10,
      },
      {
        name: 'Rate Limiting Configuration',
        check: () => config.rateLimitRequests >= 50,
        errorMessage: 'Rate limiting may be too restrictive',
        recommendations: [
          'Review rate limiting thresholds',
          'Consider different limits for authenticated vs anonymous users',
          'Monitor rate limiting effectiveness',
        ],
        points: 5,
      },
      {
        name: 'Cache TTL Configuration',
        check: () => config.cacheTtl >= 300000,
        errorMessage: 'Cache TTL may be too short',
        recommendations: [
          'Consider increasing cache TTL for better performance',
          'Implement cache invalidation strategies',
          'Monitor cache hit rates',
        ],
        points: 10,
      },
    ];

    for (const check of performanceChecks) {
      if (!check.check()) {
        errors.push(`🚫 ${check.errorMessage}`);
        recommendations.push(...check.recommendations);
        score -= check.points;
      }
    }

    return { errors, recommendations, score: Math.max(0, score) };
  }

  /**
   * Configuration validation
   */
  private validateConfiguration(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical configuration checks
    if (!config.apiBaseUrl || !config.apiBaseUrl.startsWith('http')) {
      errors.push('🚫 API base URL is not properly configured');
    }

    if (!config.rpcUrl || !config.rpcUrl.startsWith('http')) {
      errors.push('🚫 RPC URL is not properly configured');
    }

    if (!config.blockExplorerUrl || !config.blockExplorerUrl.startsWith('http')) {
      errors.push('🚫 Block explorer URL is not properly configured');
    }

    if (!config.appName || config.appName.trim() === '') {
      errors.push('🚫 Application name is not configured');
    }

    if (!config.appVersion || config.appVersion.trim() === '') {
      errors.push('🚫 Application version is not configured');
    }

    // Warning configuration checks
    if (config.chainId !== 56 && import.meta.env.MODE === 'production') {
      warnings.push('⚠️ Using non-BSC mainnet chain ID in production');
    }

    if (config.rateLimitRequests < 10) {
      warnings.push('⚠️ Rate limit requests may be too low');
    }

    if (config.cacheTtl < 60000) {
      warnings.push('⚠️ Cache TTL may be too short');
    }

    if (!config.privacyPolicyUrl) {
      warnings.push('⚠️ Privacy policy URL is not configured');
    }

    if (!config.termsOfServiceUrl) {
      warnings.push('⚠️ Terms of service URL is not configured');
    }

    return { errors, warnings };
  }

  /**
   * Feature flags validation
   */
  private validateFeatureFlags(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check critical feature flags in production
    if (import.meta.env.MODE === 'production') {
      if (featureFlagManager.isEnabled('SECURE_CSP')) {
        // CSP should be enabled in production
      } else {
        errors.push('🚫 Content Security Policy should be enabled in production');
      }

      if (featureFlagManager.isEnabled('ERROR_BOUNDARIES')) {
        // Error boundaries should be enabled
      } else {
        errors.push('🚫 Error boundaries should be enabled in production');
      }

      if (featureFlagManager.isEnabled('SECURITY_HEADERS')) {
        // Security headers should be enabled
      } else {
        errors.push('🚫 Security headers should be enabled in production');
      }

      // Development features should be disabled
      if (featureFlagManager.isEnabled('DEV_TOOLS')) {
        errors.push('🚫 Development tools should be disabled in production');
      }

      if (featureFlagManager.isEnabled('DEBUG_LOGS')) {
        errors.push('🚫 Debug logs should be disabled in production');
      }

      if (featureFlagManager.isEnabled('MOCK_DATA')) {
        errors.push('🚫 Mock data should be disabled in production');
      }
    }

    // Check optional but recommended features
    if (!featureFlagManager.isEnabled('PERFORMANCE_MONITORING')) {
      warnings.push('⚠️ Performance monitoring is recommended for production');
    }

    if (!featureFlagManager.isEnabled('ERROR_REPORTING')) {
      warnings.push('⚠️ Error reporting is recommended for production');
    }

    return { errors, warnings };
  }

  /**
   * Emergency controls validation
   */
  private validateEmergencyControls(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check emergency controls are properly configured
    if (!config.maintenanceMessage) {
      warnings.push('⚠️ Maintenance message is not configured');
    }

    if (!config.maintenanceRedirectUrl) {
      warnings.push('⚠️ Maintenance redirect URL is not configured');
    }

    if (!config.emergencyMessage) {
      warnings.push('⚠️ Emergency message is not configured');
    }

    if (!config.emergencyContact) {
      warnings.push('⚠️ Emergency contact is not configured');
    }

    // Check emergency controls are not accidentally enabled
    if (config.maintenanceMode) {
      errors.push('🚫 Maintenance mode is enabled - application will not be accessible');
    }

    if (config.emergencyShutdown) {
      errors.push('🚫 Emergency shutdown is enabled - application will be inaccessible');
    }

    return { errors, warnings };
  }

  /**
   * Calculate overall readiness score
   */
  private calculateReadinessScore(
    securityScore: number,
    performanceScore: number,
    errorsCount: number,
    warningsCount: number
  ): number {
    let score = 100;

    // Weight security and performance
    score = (score * 0.4) + (securityScore * 0.4);
    score = (score * 0.3) + (performanceScore * 0.3);

    // Penalize errors heavily
    score -= errorsCount * 15;

    // Penalize warnings lightly
    score -= warningsCount * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate production readiness report
   */
  public generateReadinessReport(): string {
    const validation = this.validateProductionReadiness();

    let report = '\n📊 **Production Readiness Report**\n';
    report += '='.repeat(50) + '\n\n';

    // Overall score
    report += `🎯 **Overall Readiness Score: ${validation.readinessScore}%**\n`;
    report += `🔒 **Security Score: ${validation.securityScore}%**\n`;
    report += `⚡ **Performance Score: ${validation.performanceScore}%**\n`;
    report += `✅ **Status: ${validation.isValid ? 'READY' : 'NOT READY'}**\n\n`;

    // Errors
    if (validation.errors.length > 0) {
      report += '🚫 **Critical Issues:**\n';
      validation.errors.forEach(error => {
        report += `  ${error}\n`;
      });
      report += '\n';
    }

    // Warnings
    if (validation.warnings.length > 0) {
      report += '⚠️ **Warnings:**\n';
      validation.warnings.forEach(warning => {
        report += `  ${warning}\n`;
      });
      report += '\n';
    }

    // Recommendations
    if (validation.recommendations.length > 0) {
      report += '💡 **Recommendations:**\n';
      validation.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }

    // Configuration summary
    report += '📋 **Configuration Summary:**\n';
    report += `  • Environment: ${import.meta.env.MODE}\n`;
    report += `  • Security Headers: ${config.securityHeadersEnabled ? '✅' : '❌'}\n`;
    report += `  • CSP Enabled: ${config.cspEnabled ? '✅' : '❌'}\n`;
    report += `  • Source Maps: ${config.buildSourceMap ? '❌' : '✅'}\n`;
    report += `  • Performance Monitoring: ${config.enablePerformanceMonitoring ? '✅' : '❌'}\n`;
    report += `  • Error Reporting: ${config.enableErrorReporting ? '✅' : '❌'}\n`;
    report += `  • Caching: ${config.cacheEnabled ? '✅' : '❌'}\n`;
    report += `  • Lazy Loading: ${config.lazyLoadingEnabled ? '✅' : '❌'}\n`;
    report += `  • Image Optimization: ${config.imageOptimization ? '✅' : '❌'}\n`;

    return report;
  }

  /**
   * Validate and log configuration on startup
   */
  public validateOnStartup(): boolean {
    console.log('🔍 Validating production configuration...');

    const isValid = validateConfiguration();
    if (!isValid) {
      console.error('❌ Configuration validation failed');
      return false;
    }

    if (import.meta.env.MODE === 'production') {
      const validation = this.validateProductionReadiness();

      if (!validation.isValid) {
        console.error('❌ Production readiness validation failed');
        console.error(this.generateReadinessReport());
        return false;
      }

      if (validation.readinessScore < 80) {
        console.warn('⚠️ Production readiness score is below 80%');
        console.warn(this.generateReadinessReport());
      }

      console.log('✅ Production configuration validated successfully');
      console.log(`📊 Readiness Score: ${validation.readinessScore}%`);
    } else {
      console.log('✅ Development configuration validated successfully');
    }

    return true;
  }
}

/**
 * Validate production readiness
 */
export const validateProductionReadiness = (): ValidationResult => {
  const validator = ProductionValidator.getInstance();
  return validator.validateProductionReadiness();
};

/**
 * Generate production readiness report
 */
export const generateReadinessReport = (): string => {
  const validator = ProductionValidator.getInstance();
  return validator.generateReadinessReport();
};

/**
 * Validate configuration on startup
 */
export const validateConfigurationOnStartup = (): boolean => {
  const validator = ProductionValidator.getInstance();
  return validator.validateOnStartup();
};

// Export singleton instance
export const productionValidator = ProductionValidator.getInstance();