import { PrismaClient } from '../generated/prisma';
import logger from '../utils/logger';

interface MonitoringConfig {
  enabled: boolean;
  metricsEndpoint: string;
  healthCheckInterval: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    databaseConnections: number;
    databaseSize: number;
  };
  notifications: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    redis: boolean;
    blockchain: boolean;
    diskSpace: boolean;
    memory: boolean;
  };
  metrics: {
    databaseConnections: number;
    databaseSize: string;
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
  timestamp: Date;
}

interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'warning' | 'critical';
  message: string | ((metrics: any) => string);
  cooldown: number; // seconds
  lastTriggered?: Date;
}

class ProductionMonitoringService {
  private prisma: PrismaClient;
  private config: MonitoringConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private alertRules: AlertRule[] = [];
  private metricsHistory: any[] = [];
  private startTime: Date;

  constructor(config: MonitoringConfig) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.PRODUCTION_DATABASE_URL,
        },
      },
    });

    this.config = config;
    this.startTime = new Date();
    this.initializeAlertRules();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRate > this.config.alertThresholds.errorRate,
        severity: 'critical',
        message: (metrics: any) => `Error rate (${metrics.errorRate}%) exceeds threshold (${this.config.alertThresholds.errorRate}%)`,
        cooldown: 300, // 5 minutes
      },
      {
        name: 'Slow Response Time',
        condition: (metrics) => metrics.responseTime > this.config.alertThresholds.responseTime,
        severity: 'warning',
        message: (metrics: any) => `Response time (${metrics.responseTime}ms) exceeds threshold (${this.config.alertThresholds.responseTime}ms)`,
        cooldown: 600, // 10 minutes
      },
      {
        name: 'High Database Connections',
        condition: (metrics) => metrics.databaseConnections > this.config.alertThresholds.databaseConnections,
        severity: 'warning',
        message: (metrics: any) => `Database connections (${metrics.databaseConnections}) exceed threshold (${this.config.alertThresholds.databaseConnections})`,
        cooldown: 300,
      },
      {
        name: 'Database Size Warning',
        condition: (metrics) => {
          const sizeGB = this.parseDatabaseSize(metrics.databaseSize);
          return sizeGB > this.config.alertThresholds.databaseSize;
        },
        severity: 'warning',
        message: (metrics: any) => `Database size (${metrics.databaseSize}) exceeds threshold (${this.config.alertThresholds.databaseSize}GB)`,
        cooldown: 3600, // 1 hour
      },
      {
        name: 'Database Connection Failed',
        condition: (metrics) => !metrics.databaseConnections,
        severity: 'critical',
        message: 'Database connection failed',
        cooldown: 60,
      },
    ];
  }

  private parseDatabaseSize(sizeStr: string): number {
    // Parse size string like "10GB", "500MB", etc.
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'B': return value / (1024 * 1024 * 1024);
      case 'KB': return value / (1024 * 1024);
      case 'MB': return value / 1024;
      case 'GB': return value;
      case 'TB': return value * 1024;
      default: return 0;
    }
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Production monitoring is disabled');
      return;
    }

    logger.info('Starting production monitoring service');

    // Start health check timer
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval
    );

    // Perform initial health check
    await this.performHealthCheck();
  }

  async stop(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    await this.prisma.$disconnect();
    logger.info('Production monitoring service stopped');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthCheck = await this.getHealthCheck();

      // Store metrics history
      this.metricsHistory.push({
        ...healthCheck.metrics,
        timestamp: healthCheck.timestamp,
      });

      // Keep only last 1000 records
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Check alert rules
      await this.checkAlertRules(healthCheck.metrics);

      // Log health status
      if (healthCheck.status === 'critical') {
        logger.error('CRITICAL: System health check failed', healthCheck);
      } else if (healthCheck.status === 'warning') {
        logger.warn('WARNING: System health check issues detected', healthCheck);
      }

    } catch (error) {
      logger.error('Health check failed', error);
      await this.sendAlert({
        type: 'health_check_failed',
        severity: 'critical',
        message: 'Health check process failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  async getHealthCheck(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      blockchain: await this.checkBlockchain(),
      diskSpace: await this.checkDiskSpace(),
      memory: await this.checkMemory(),
    };

    const metrics = {
      databaseConnections: await this.getDatabaseConnections(),
      databaseSize: await this.getDatabaseSize(),
      responseTime: await this.getResponseTime(),
      errorRate: await this.getErrorRate(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };

    // Determine overall health status
    const failedChecks = Object.entries(checks).filter(([_, healthy]) => !healthy);
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (failedChecks.length > 0) {
      status = failedChecks.length >= 2 ? 'critical' : 'warning';
    }

    return {
      status,
      checks,
      metrics,
      timestamp: new Date(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      // Import Redis here to avoid issues if Redis is not installed
      const { default: Redis } = await import('redis');
      const redis = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      await redis.ping();
      await redis.quit();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', error);
      return false;
    }
  }

  private async checkBlockchain(): Promise<boolean> {
    try {
      // Check blockchain node connectivity
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);

      const blockNumber = await provider.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      logger.error('Blockchain health check failed', error);
      return false;
    }
  }

  private async checkDiskSpace(): Promise<boolean> {
    try {
      const stats = require('fs').statSync(process.cwd());
      // On Unix systems, we can use 'df' command
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h /', { encoding: 'utf8' });

      // Parse disk usage from df output
      const lines = dfOutput.split('\n');
      if (lines.length > 1) {
        const usageLine = lines[1].split(/\s+/);
        const usagePercent = parseInt(usageLine[4]);
        return usagePercent < 90; // Alert if over 90% full
      }

      return true;
    } catch (error) {
      logger.error('Disk space check failed', error);
      return true; // Don't fail if we can't check disk space
    }
  }

  private async checkMemory(): Promise<boolean> {
    try {
      const used = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const memoryUsagePercent = (used.heapUsed / totalMemory) * 100;

      return memoryUsagePercent < 90; // Alert if over 90% memory usage
    } catch (error) {
      logger.error('Memory check failed', error);
      return true;
    }
  }

  private async getDatabaseConnections(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND state = 'active'
      `;
      return Number(result[0].count);
    } catch (error) {
      logger.error('Failed to get database connections', error);
      return 0;
    }
  }

  private async getDatabaseSize(): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      return String(result[0].size);
    } catch (error) {
      logger.error('Failed to get database size', error);
      return '0 B';
    }
  }

  private async getResponseTime(): Promise<number> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return Date.now() - start;
    } catch (error) {
      logger.error('Failed to measure response time', error);
      return 0;
    }
  }

  private async getErrorRate(): Promise<number> {
    try {
      // Get error rate from recent log entries
      // For now, comment out audit log queries as they may not exist
      // const recentLogs = await this.prisma.auditLog.findMany({
      //   where: {
      //     createdAt: {
      //       gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      //   },
      //   success: false,
      // },
      // });

      const recentLogs = []; // Placeholder

      const totalLogs = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      });

      if (totalLogs === 0) return 0;
      return (recentLogs.length / totalLogs) * 100;
    } catch (error) {
      logger.error('Failed to calculate error rate', error);
      return 0;
    }
  }

  private async checkAlertRules(metrics: any): Promise<void> {
    const now = new Date();

    for (const rule of this.alertRules) {
      // Check cooldown
      if (rule.lastTriggered &&
          (now.getTime() - rule.lastTriggered.getTime()) < rule.cooldown * 1000) {
        continue;
      }

      // Check condition
      if (rule.condition(metrics)) {
        rule.lastTriggered = now;
        await this.sendAlert({
          type: 'rule_triggered',
          ruleName: rule.name,
          severity: rule.severity,
          message: typeof rule.message === 'function' ? rule.message(metrics) : rule.message,
          metrics,
          timestamp: now,
        });
      }
    }
  }

  private async sendAlert(alert: {
    type: string;
    ruleName?: string;
    severity: 'warning' | 'critical';
    message: string;
    metrics?: any;
    error?: string;
    timestamp: Date;
  }): Promise<void> {
    const alertData = {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      timestamp: alert.timestamp.toISOString(),
      ...alert,
    };

    // Send Slack notification
    if (this.config.notifications.slack) {
      await this.sendSlackAlert(alertData);
    }

    // Send email notification
    if (this.config.notifications.email?.length) {
      await this.sendEmailAlert(alertData);
    }

    // Send webhook notification
    if (this.config.notifications.webhook) {
      await this.sendWebhookAlert(alertData);
    }

    // Log alert
    if (alert.severity === 'critical') {
      logger.error('CRITICAL ALERT', alertData);
    } else {
      logger.warn('ALERT', alertData);
    }
  }

  private async sendSlackAlert(alert: any): Promise<void> {
    try {
      const color = alert.severity === 'critical' ? 'danger' : 'warning';
      const payload = {
        attachments: [{
          color: color,
          title: `${alert.severity.toUpperCase()}: ${alert.ruleName || alert.type}`,
          text: alert.message,
          fields: [
            {
              title: 'Environment',
              value: alert.environment,
              short: true,
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true,
            },
            ...(alert.metrics ? [
              {
                title: 'Database Connections',
                value: String(alert.metrics.databaseConnections),
                short: true,
              },
              {
                title: 'Response Time',
                value: `${alert.metrics.responseTime}ms`,
                short: true,
              },
              {
                title: 'Error Rate',
                value: `${alert.metrics.errorRate.toFixed(2)}%`,
                short: true,
              },
            ] : []),
          ],
          footer: 'Rabbit Launchpad Backend Monitoring',
          ts: Math.floor(Date.now() / 1000),
        }],
      };

      const response = await fetch(this.config.notifications.slack!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', error);
    }
  }

  private async sendEmailAlert(alert: any): Promise<void> {
    try {
      // This would integrate with your email service
      // For now, just log that an email would be sent
      logger.info('Email alert would be sent:', {
        to: this.config.notifications.email,
        subject: `Rabbit Launchpad Alert: ${alert.ruleName || alert.type}`,
        alert,
      });
    } catch (error) {
      logger.error('Failed to send email alert', error);
    }
  }

  private async sendWebhookAlert(alert: any): Promise<void> {
    try {
      const response = await fetch(this.config.notifications.webhook!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', error);
    }
  }

  async getMetricsHistory(limit: number = 100): Promise<any[]> {
    return this.metricsHistory.slice(-limit);
  }

  async getCurrentMetrics(): Promise<any> {
    const healthCheck = await this.getHealthCheck();
    return healthCheck.metrics;
  }

  async getSystemInfo(): Promise<any> {
    try {
      const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        uptime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          external: memoryUsage.external,
        },
        cpu: cpuUsage,
        platform: process.platform,
        nodeVersion: process.version,
      };
    } catch (error) {
      logger.error('Failed to get system info', error);
      return {};
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const databaseInfo = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          COUNT(*) as table_count,
          SUM(pg_total_relation_size(relid)) as size_bytes
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        GROUP BY schemaname
      `;

      const totalSize = await this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as total_size
      `;

      const connections = await this.prisma.$queryRaw`
        SELECT
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `;

      return {
        databaseInfo,
        totalSize: totalSize[0].total_size,
        connections,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get database stats', error);
      return {};
    }
  }
}

export default ProductionMonitoringService;